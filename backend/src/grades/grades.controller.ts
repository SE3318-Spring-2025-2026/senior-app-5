import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiUnprocessableEntityResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { GradesService } from './grades.service';
import { GroupFinalGradeDto } from './dto/group-final-grade.dto';
import { StudentFinalGradeDto } from './dto/student-final-grade.dto';
import { ListGradeHistoryQueryDto } from './dto/list-grade-history-query.dto';
import { PaginatedGradeHistoryDto } from './dto/paginated-grade-history.dto';
import { CalculateGradeDto } from './dto/calculate-grade.dto';
import { GradeCalculationResultDto } from './dto/grade-calculation-result.dto';
import { CreateDeliverableEvaluationDto } from './dto/create-deliverable-evaluation.dto';
import { DeliverableEvaluationResponseDto } from './dto/deliverable-evaluation-response.dto';

interface RequestWithUser extends Request {
  user: { userId?: string; sub?: string; _id?: string; role: Role };
}

@ApiTags('Grades')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class GradesController {
  private readonly logger = new Logger(GradesController.name);

  constructor(private readonly gradesService: GradesService) {}

  private getCorrelationId(req: Request): string | undefined {
    const correlationId = req.headers['x-correlation-id'];
    return typeof correlationId === 'string' ? correlationId : undefined;
  }

  private getJwtStudentId(req: RequestWithUser): string | undefined {
    return req.user.userId ?? req.user.sub ?? req.user._id;
  }

  private assertStudentOwnership(
    requestedStudentId: string,
    req: RequestWithUser,
  ): void {
    const jwtStudentId = this.getJwtStudentId(req);

    if (req.user.role !== Role.Student) {
      return;
    }

    if (String(jwtStudentId) === requestedStudentId) {
      return;
    }

    const correlationId = this.getCorrelationId(req);

    this.logger.warn(
      JSON.stringify({
        event: 'unauthorized_grade_access_attempt',
        requestedStudentId,
        jwtStudentId: jwtStudentId ?? null,
        callerRole: req.user.role,
        correlationId: correlationId ?? null,
      }),
    );

    throw new ForbiddenException("Cannot access another student's grade.");
  }

  private getRequiredJwtUserId(req: RequestWithUser): string {
    const userId = this.getJwtStudentId(req);
    if (!userId) {
      throw new BadRequestException('JWT does not include a user identifier.');
    }
    return userId;
  }

  @ApiOperation({
    operationId: 'recordDeliverableEvaluation',
    summary: 'Record final deliverable evaluation for a group',
  })
  @ApiOkResponse({ type: DeliverableEvaluationResponseDto })
  @ApiBadRequestResponse({
    description: 'Validation error, missing deliverable, or group not ASSIGNED',
  })
  @ApiConflictResponse({
    description: 'Evaluation already exists for the same group and deliverable',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @Roles(Role.Professor, Role.Admin)
  @HttpCode(HttpStatus.CREATED)
  @Post('deliverable-evaluations')
  async recordDeliverableEvaluation(
    @Body() dto: CreateDeliverableEvaluationDto,
    @Req() req: RequestWithUser,
  ): Promise<DeliverableEvaluationResponseDto> {
    const gradedBy = this.getRequiredJwtUserId(req);
    return this.gradesService.recordDeliverableEvaluation(dto, gradedBy);
  }

  @ApiOperation({
    operationId: 'listDeliverableEvaluations',
    summary: 'List deliverable evaluations with optional filters',
  })
  @ApiOkResponse({
    description: 'Deliverable evaluations returned successfully.',
  })
  @ApiQuery({ name: 'groupId', required: false, type: String })
  @ApiQuery({ name: 'deliverableId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @Roles(Role.Coordinator, Role.Professor, Role.Admin)
  @Get('deliverable-evaluations')
  async listDeliverableEvaluations(
    @Query('groupId') groupId?: string,
    @Query('deliverableId') deliverableId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.gradesService.listDeliverableEvaluations(
      { groupId, deliverableId },
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @ApiOperation({
    operationId: 'getDeliverableEvaluation',
    summary: 'Get deliverable evaluation by ID',
  })
  @ApiOkResponse({ type: DeliverableEvaluationResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'Evaluation not found' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @Roles(Role.Coordinator, Role.Professor, Role.Admin)
  @Get('deliverable-evaluations/:evaluationId')
  async getDeliverableEvaluation(
    @Param('evaluationId', ParseUUIDPipe) evaluationId: string,
  ): Promise<DeliverableEvaluationResponseDto> {
    return this.gradesService.getDeliverableEvaluation(evaluationId);
  }

  @ApiOperation({
    operationId: 'getGroupFinalGrade',
    summary: 'Get stored final grade for a group',
  })
  @ApiOkResponse({ type: GroupFinalGradeDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'No final grade calculated yet' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @Roles(Role.Coordinator, Role.Professor, Role.Admin)
  @Get('groups/:groupId/final-grade')
  async getGroupFinalGrade(
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ): Promise<GroupFinalGradeDto> {
    return this.gradesService.getGroupFinalGrade(groupId);
  }

  @ApiOperation({
    operationId: 'getStudentFinalGrade',
    summary: 'Get stored final grade for a student',
  })
  @ApiOkResponse({ type: StudentFinalGradeDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'No final grade calculated yet' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @Roles(Role.Coordinator, Role.Professor, Role.Admin, Role.Student)
  @Get('students/:studentId/final-grade')
  async getStudentFinalGrade(
    @Param('studentId') studentId: string,
    @Req() req: RequestWithUser,
  ): Promise<StudentFinalGradeDto> {
    this.assertStudentOwnership(studentId, req);

    return this.gradesService.getStudentFinalGrade(studentId);
  }

  @ApiOperation({
    operationId: 'getGradeHistory',
    summary: 'Get grade history snapshots for a group',
  })
  @ApiOkResponse({ type: PaginatedGradeHistoryDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'No grade history found' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @Roles(Role.Coordinator, Role.Admin)
  @Get('groups/:groupId/grade-history')
  async getGradeHistory(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Query() query: ListGradeHistoryQueryDto,
  ): Promise<PaginatedGradeHistoryDto> {
    return this.gradesService.getGradeHistory(groupId, query);
  }

  @ApiOperation({
    operationId: 'calculateGrade',
    summary: 'Calculate and persist final grades for a group',
  })
  @ApiOkResponse({ type: GradeCalculationResultDto })
  @ApiConflictResponse({
    description: 'Final grade already exists and force=false',
  })
  @ApiUnprocessableEntityResponse({
    description:
      'Missing preconditions (evaluations not complete, config missing, etc)',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @ApiOperation({
    operationId: 'aggregateCommitteeGrades',
    summary:
      'Aggregate all deliverable evaluation grades for groups in a committee',
  })
  @ApiOkResponse({
    description: 'Committee grade aggregation returned successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'Committee not found' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @Roles(Role.Coordinator, Role.Professor, Role.Admin)
  @HttpCode(HttpStatus.OK)
  @Get('committees/:committeeId/grades')
  async aggregateCommitteeGrades(
    @Param('committeeId', ParseUUIDPipe) committeeId: string,
  ) {
    return this.gradesService.aggregateCommitteeGrades(committeeId);
  }

  @Roles(Role.Coordinator)
  @HttpCode(HttpStatus.OK)
  @Post('groups/:groupId/calculate')
  async calculateGrade(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: CalculateGradeDto,
    @Req() req: RequestWithUser,
  ): Promise<GradeCalculationResultDto> {
    const triggeredBy = this.getRequiredJwtUserId(req);
    const correlationId = this.getCorrelationId(req);

    return this.gradesService.calculateGrade(
      groupId,
      dto,
      triggeredBy,
      correlationId,
    );
  }
}
