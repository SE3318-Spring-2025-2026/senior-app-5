import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { CreateSprintEvaluationDto } from './dto/create-sprint-evaluation.dto';
import { SprintEvaluationResponseDto } from './dto/sprint-evaluation-response.dto';
import { SprintEvaluationsService } from './sprint-evaluations.service';

interface RequestWithUser extends Request {
  user?: {
    userId?: string;
    sub?: string;
    _id?: string;
    role?: string;
  };
}

@ApiTags('Sprint Evaluations')
@Controller('sprint-evaluations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SprintEvaluationsController {
  constructor(private readonly sprintEvaluationsService: SprintEvaluationsService) {}

  private getCorrelationId(req: Request): string | undefined {
    const headerValue =
      req.headers?.['x-correlation-id'] ?? req.headers?.['x-request-id'];
    return typeof headerValue === 'string' ? headerValue : undefined;
  }

  private getCaller(req: RequestWithUser): { userId?: string; role?: string } {
    return {
      userId: req.user?.userId ?? req.user?.sub ?? req.user?._id,
      role: req.user?.role,
    };
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    operationId: 'recordSprintEvaluation',
    summary: 'Record a sprint evaluation for a group',
  })
  @ApiCreatedResponse({
    description: 'Sprint evaluation recorded successfully',
    type: SprintEvaluationResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Request validation failed' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Authenticated but insufficient permissions' })
  @ApiConflictResponse({ description: 'Duplicate sprint evaluation' })
  @ApiResponse({ status: HttpStatus.LOCKED, description: 'Active sprint window is closed' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected internal failure' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.Professor)
  async recordSprintEvaluation(
    @Body() body: CreateSprintEvaluationDto,
    @Req() req: RequestWithUser,
  ): Promise<SprintEvaluationResponseDto> {
    const correlationId = this.getCorrelationId(req);
    return this.sprintEvaluationsService.recordSprintEvaluation(
      body,
      this.getCaller(req),
      correlationId,
    );
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    operationId: 'getSprintEvaluation',
    summary: 'Get a sprint evaluation record',
  })
  @ApiOkResponse({
    description: 'Sprint evaluation found',
    type: SprintEvaluationResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Authenticated but insufficient permissions' })
  @ApiNotFoundResponse({ description: 'Sprint evaluation not found' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected internal failure' })
  @Get(':evaluationId')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.Coordinator, Role.Professor)
  async getSprintEvaluation(
    @Param('evaluationId', new ParseUUIDPipe()) evaluationId: string,
    @Req() req: RequestWithUser,
  ): Promise<SprintEvaluationResponseDto> {
    const correlationId = this.getCorrelationId(req);
    return this.sprintEvaluationsService.getSprintEvaluation(
      evaluationId,
      this.getCaller(req),
      correlationId,
    );
  }
}
