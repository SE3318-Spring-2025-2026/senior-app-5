import {
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
  ApiTags,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiUnprocessableEntityResponse,
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
  @ApiConflictResponse({ description: 'Final grade already exists and force=false' })
  @ApiUnprocessableEntityResponse({ description: 'Missing preconditions (evaluations not complete, config missing, etc)' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @Roles(Role.Coordinator)
  @HttpCode(HttpStatus.OK)
  @Post('groups/:groupId/calculate')
  async calculateGrade(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: CalculateGradeDto,
    @Req() req: RequestWithUser,
  ): Promise<GradeCalculationResultDto> {
    const triggeredBy = this.getJwtStudentId(req);
    const correlationId = this.getCorrelationId(req);
    
    // In a real scenario, this would use a proper user ID. For our MVP, we extract
    // what we can or fall back to 'SYSTEM'
    const finalTriggeredBy = triggeredBy ?? 'SYSTEM';
    
    return this.gradesService.calculateGrade(
      groupId,
      dto,
      finalTriggeredBy,
      correlationId,
    );
  }
}
