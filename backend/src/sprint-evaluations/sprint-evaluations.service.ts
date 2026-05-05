import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../auth/enums/role.enum';
import {
  Group,
  GroupAssignmentStatus,
  GroupDocument,
} from '../groups/group.entity';
import {
  Schedule,
  ScheduleDocument,
  SchedulePhase,
} from '../advisors/schemas/schedule.schema';
import {
  SprintEvaluation,
  SprintEvaluationDocument,
  SprintEvaluationStatus,
} from './schemas/sprint-evaluation.schema';
import { CreateSprintEvaluationDto } from './dto/create-sprint-evaluation.dto';
import { SprintEvaluationResponseDto } from './dto/sprint-evaluation-response.dto';
import { softGradeValue } from './fixtures/sprint-rubric.fixtures';
import { RubricsService } from '../rubrics/rubrics.service';
import { RubricDocument } from '../rubrics/schemas/rubric.schema';

interface RequestContext {
  userId?: string;
  role?: string;
}

@Injectable()
export class SprintEvaluationsService {
  private readonly logger = new Logger(SprintEvaluationsService.name);

  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>,
    @InjectModel(Schedule.name)
    private readonly scheduleModel: Model<ScheduleDocument>,
    @InjectModel(SprintEvaluation.name)
    private readonly sprintEvaluationModel: Model<SprintEvaluationDocument>,
    private readonly rubricsService: RubricsService,
  ) {}

  async recordSprintEvaluation(
    dto: CreateSprintEvaluationDto,
    caller: RequestContext,
    correlationId?: string,
  ): Promise<SprintEvaluationResponseDto> {
    const advisorUserId = caller.userId;
    if (!advisorUserId) {
      throw new ForbiddenException('Invalid authenticated user.');
    }

    await this.ensureSprintWindowIsOpen(correlationId);
    await this.ensureAdvisorOwnsGroup(
      dto.groupId,
      advisorUserId,
      correlationId,
    );
    const rubric = await this.resolveActiveRubric(
      dto.deliverableId,
      correlationId,
    );
    this.ensureQuestionMatch(dto, rubric);
    await this.ensureEvaluationDoesNotExist(dto, correlationId);

    const averageScore = this.calculateAverageScore(dto.responses, rubric);
    const evaluation = await this.sprintEvaluationModel.create({
      groupId: dto.groupId,
      sprintId: dto.sprintId,
      deliverableId: dto.deliverableId,
      evaluationType: dto.evaluationType,
      rubricId: rubric.rubricId,
      responses: dto.responses,
      averageScore,
      status: SprintEvaluationStatus.SUBMITTED,
    });

    this.logger.log({
      event: 'sprint_evaluation_recorded',
      evaluationId: evaluation.evaluationId,
      groupId: dto.groupId,
      sprintId: dto.sprintId,
      deliverableId: dto.deliverableId,
      evaluationType: dto.evaluationType,
      rubricId: rubric.rubricId,
      correlationId,
    });

    return this.toResponseDto(evaluation);
  }

  async getSprintEvaluation(
    evaluationId: string,
    caller: RequestContext,
    correlationId?: string,
  ): Promise<SprintEvaluationResponseDto> {
    try {
      const evaluation = await this.sprintEvaluationModel
        .findOne({ evaluationId })
        .exec();

      if (!evaluation) {
        throw new NotFoundException(
          `Sprint evaluation with ID '${evaluationId}' not found.`,
        );
      }

      if (caller.role === Role.Professor) {
        await this.ensureAdvisorOwnsGroup(
          evaluation.groupId,
          caller.userId ?? '',
          correlationId,
        );
      }

      return this.toResponseDto(evaluation);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.logger.error({
        event: 'sprint_evaluation_read_failed',
        evaluationId,
        correlationId,
        error: (error as Error).message,
      });
      throw new InternalServerErrorException(
        'Failed to retrieve sprint evaluation due to an unexpected error.',
      );
    }
  }

  private async ensureSprintWindowIsOpen(
    correlationId?: string,
  ): Promise<void> {
    const now = new Date();
    const activeWindow = await this.scheduleModel
      .findOne({
        phase: SchedulePhase.SPRINT,
        isActive: true,
        startDatetime: { $lte: now },
        endDatetime: { $gte: now },
      })
      .exec();

    if (!activeWindow) {
      this.logger.warn({
        event: 'sprint_evaluation_window_closed',
        correlationId,
      });
      throw new HttpException(
        'No active sprint evaluation window is open.',
        HttpStatus.LOCKED,
      );
    }
  }

  private async ensureAdvisorOwnsGroup(
    groupId: string,
    advisorUserId: string,
    correlationId?: string,
  ): Promise<Group> {
    const group = await this.groupModel
      .findOne({
        groupId,
        assignedAdvisorId: advisorUserId,
        assignmentStatus: GroupAssignmentStatus.ASSIGNED,
      })
      .exec();

    if (!group) {
      const existingGroup = await this.groupModel.findOne({ groupId }).exec();
      if (!existingGroup) {
        throw new NotFoundException(`Group with ID '${groupId}' not found.`);
      }

      this.logger.warn({
        event: 'sprint_evaluation_ownership_violation',
        groupId,
        advisorUserId,
        correlationId,
      });
      throw new ForbiddenException(
        'The requested group is not assigned to the calling advisor.',
      );
    }

    return group;
  }

  private async ensureEvaluationDoesNotExist(
    dto: CreateSprintEvaluationDto,
    correlationId?: string,
  ): Promise<void> {
    const duplicate = await this.sprintEvaluationModel
      .findOne({
        groupId: dto.groupId,
        sprintId: dto.sprintId,
        deliverableId: dto.deliverableId,
        evaluationType: dto.evaluationType,
      })
      .exec();

    if (duplicate) {
      this.logger.warn({
        event: 'sprint_evaluation_duplicate_detected',
        groupId: dto.groupId,
        sprintId: dto.sprintId,
        deliverableId: dto.deliverableId,
        evaluationType: dto.evaluationType,
        correlationId,
      });
      throw new ConflictException(
        'A sprint evaluation already exists for this group, sprint, deliverable, and evaluation type.',
      );
    }
  }

  private async resolveActiveRubric(
    deliverableId: string,
    correlationId?: string,
  ): Promise<RubricDocument> {
    const rubric = await this.rubricsService.getActiveRubric(
      deliverableId,
      correlationId,
    );

    if (!rubric) {
      this.logger.warn({
        event: 'sprint_evaluation_rubric_missing',
        deliverableId,
        correlationId,
      });
      throw new BadRequestException(
        'No active rubric is available for this deliverable.',
      );
    }

    return rubric;
  }

  private ensureQuestionMatch(
    dto: CreateSprintEvaluationDto,
    rubric: RubricDocument,
  ): void {
    const rubricQuestionIds = new Set(
      rubric.questions.map((question) => question.questionId),
    );
    const responseQuestionIds = new Set(
      dto.responses.map((response) => response.questionId),
    );

    if (
      rubricQuestionIds.size !== responseQuestionIds.size ||
      [...responseQuestionIds].some(
        (questionId) => !rubricQuestionIds.has(questionId),
      )
    ) {
      throw new BadRequestException(
        'Response questionIds must match the active rubric questions.',
      );
    }
  }

  private toResponseDto(
    evaluation: SprintEvaluationDocument,
  ): SprintEvaluationResponseDto {
    return {
      evaluationId: evaluation.evaluationId,
      groupId: evaluation.groupId,
      sprintId: evaluation.sprintId,
      deliverableId: evaluation.deliverableId,
      evaluationType: evaluation.evaluationType,
      rubricId: evaluation.rubricId,
      responses: evaluation.responses.map((response) => ({
        questionId: response.questionId,
        softGrade: response.softGrade,
      })),
      averageScore: evaluation.averageScore,
      status: evaluation.status ?? SprintEvaluationStatus.DRAFT,
      createdAt:
        (
          evaluation as unknown as { createdAt?: Date }
        ).createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt:
        (
          evaluation as unknown as { updatedAt?: Date }
        ).updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  private calculateAverageScore(
    responses: CreateSprintEvaluationDto['responses'],
    rubric: RubricDocument,
  ): number {
    const weightByQuestionId = new Map(
      rubric.questions.map((question) => [
        question.questionId,
        question.criteriaWeight,
      ]),
    );

    const weightedScore = responses.reduce((sum, response) => {
      const criteriaWeight = weightByQuestionId.get(response.questionId) ?? 0;
      return sum + softGradeValue(response.softGrade) * criteriaWeight;
    }, 0);

    return Number(weightedScore.toFixed(2));
  }
}
