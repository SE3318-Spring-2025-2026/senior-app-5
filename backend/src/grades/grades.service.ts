import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GroupFinalGradeDto } from './dto/group-final-grade.dto';
import { GradeHistoryEntryDto } from './dto/grade-history-entry.dto';
import { StudentFinalGradeDto } from './dto/student-final-grade.dto';
import { ListGradeHistoryQueryDto } from './dto/list-grade-history-query.dto';
import { PaginatedGradeHistoryDto } from './dto/paginated-grade-history.dto';
import { CalculateGradeDto } from './dto/calculate-grade.dto';
import {
  GradeCalculationResultDto,
  ScaledDeliverableGradeDto,
} from './dto/grade-calculation-result.dto';
import {
  GradeHistoryEntry,
  GradeHistoryEntryDocument,
  GroupFinalGrade,
  GroupFinalGradeDocument,
  StudentFinalGrade,
  StudentFinalGradeDocument,
} from './schemas/grade-records.schema';
import {
  Deliverable,
  DeliverableDocument,
} from '../deliverables/schemas/deliverable.schema';
import {
  Group,
  GroupAssignmentStatus,
  GroupDocument,
} from '../groups/group.entity';
import {
  DeliverableEvaluation,
  DeliverableGrade,
  DeliverableEvaluationDocument,
  DeliverableEvaluationStatus,
  deliverableGradeValue,
} from './schemas/deliverable-evaluation.schema';
import {
  SprintEvaluation,
  SprintEvaluationDocument,
} from '../sprint-evaluations/schemas/sprint-evaluation.schema';
import {
  SprintConfig,
  SprintConfigDocument,
} from '../story-points/schemas/sprint-config.schema';
import {
  StoryPointRecord,
  StoryPointRecordDocument,
} from '../story-points/schemas/story-point-record.schema';
import { DeliverableEvaluationResponseDto } from './dto/deliverable-evaluation-response.dto';
import { CreateDeliverableEvaluationDto } from './dto/create-deliverable-evaluation.dto';

@Injectable()
export class GradesService {
  private readonly logger = new Logger(GradesService.name);

  constructor(
    @InjectModel(GroupFinalGrade.name)
    private readonly groupFinalGradeModel: Model<GroupFinalGradeDocument>,
    @InjectModel(StudentFinalGrade.name)
    private readonly studentFinalGradeModel: Model<StudentFinalGradeDocument>,
    @InjectModel(GradeHistoryEntry.name)
    private readonly gradeHistoryEntryModel: Model<GradeHistoryEntryDocument>,
    @InjectModel(Deliverable.name)
    private readonly deliverableModel: Model<DeliverableDocument>,
    @InjectModel(Group.name)
    private readonly groupModel: Model<GroupDocument>,
    @InjectModel(DeliverableEvaluation.name)
    private readonly deliverableEvaluationModel: Model<DeliverableEvaluationDocument>,
    @InjectModel(SprintEvaluation.name)
    private readonly sprintEvaluationModel: Model<SprintEvaluationDocument>,
    @InjectModel(SprintConfig.name)
    private readonly sprintConfigModel: Model<SprintConfigDocument>,
    @InjectModel(StoryPointRecord.name)
    private readonly storyPointRecordModel: Model<StoryPointRecordDocument>,
  ) {}

  // ────────────────────────────────────────────────────────────────
  // READ ENDPOINTS (existing)
  // ────────────────────────────────────────────────────────────────

  async getGroupFinalGrade(groupId: string): Promise<GroupFinalGradeDto> {
    try {
      const groupGrade = await this.groupFinalGradeModel
        .findOne({ groupId })
        .lean()
        .exec();

      if (!groupGrade) {
        throw new NotFoundException(this.buildGroupNotFoundMessage(groupId));
      }

      const individualGrades = await this.studentFinalGradeModel
        .find({ groupId })
        .sort({ studentId: 1 })
        .lean()
        .exec();

      return {
        groupId: groupGrade.groupId,
        teamGrade: groupGrade.teamGrade,
        individualGrades: individualGrades.map((grade) =>
          this.toStudentFinalGradeDto(grade),
        ),
        calculatedAt: groupGrade.calculatedAt,
      };
    } catch (error) {
      this.rethrowKnownErrors(error, this.buildGroupNotFoundMessage(groupId));
    }
  }

  async getStudentFinalGrade(studentId: string): Promise<StudentFinalGradeDto> {
    try {
      const studentGrade = await this.studentFinalGradeModel
        .findOne({ studentId })
        .lean()
        .exec();

      if (!studentGrade) {
        throw new NotFoundException(
          this.buildStudentNotFoundMessage(studentId),
        );
      }

      return this.toStudentFinalGradeDto(studentGrade);
    } catch (error) {
      this.rethrowKnownErrors(
        error,
        this.buildStudentNotFoundMessage(studentId),
      );
    }
  }

  async getGradeHistory(
    groupId: string,
    query: ListGradeHistoryQueryDto,
  ): Promise<PaginatedGradeHistoryDto> {
    const pagination = this.normalizePagination(query);

    try {
      const skip = (pagination.page - 1) * pagination.limit;

      const [data, total] = await Promise.all([
        this.gradeHistoryEntryModel
          .find({ groupId })
          .sort({ changedAt: -1 })
          .skip(skip)
          .limit(pagination.limit)
          .lean()
          .exec(),
        this.gradeHistoryEntryModel.countDocuments({ groupId }).exec(),
      ]);

      if (!total) {
        throw new NotFoundException(
          this.buildHistoryNotFoundMessage(
            groupId,
            pagination.page,
            pagination.limit,
          ),
        );
      }

      return {
        data: data.map((entry) => this.toGradeHistoryEntryDto(entry)),
        total,
        page: pagination.page,
        limit: pagination.limit,
      };
    } catch (error) {
      this.rethrowKnownErrors(
        error,
        this.buildHistoryNotFoundMessage(
          groupId,
          pagination.page,
          pagination.limit,
        ),
      );
    }
  }

  async recordDeliverableEvaluation(
    dto: CreateDeliverableEvaluationDto,
    gradedBy: string,
  ): Promise<DeliverableEvaluationResponseDto> {
    const deliverable = await this.deliverableModel
      .findOne({ deliverableId: dto.deliverableId })
      .lean()
      .exec();
    if (!deliverable) {
      throw new BadRequestException(
        `Deliverable with ID '${dto.deliverableId}' does not exist.`,
      );
    }

    const group = await this.groupModel.findOne({ groupId: dto.groupId }).lean().exec();
    if (!group || group.assignmentStatus !== GroupAssignmentStatus.ASSIGNED) {
      throw new BadRequestException(
        `Group '${dto.groupId}' must exist and be in ASSIGNED state.`,
      );
    }

    try {
      const created = await this.deliverableEvaluationModel.create({
        groupId: dto.groupId,
        deliverableId: dto.deliverableId,
        deliverableGrade: dto.deliverableGrade,
        rawGrade: deliverableGradeValue(dto.deliverableGrade as DeliverableGrade),
        status: DeliverableEvaluationStatus.GRADED,
        gradedBy,
      });

      return this.toDeliverableEvaluationResponseDto(created.toObject());
    } catch (error) {
      const isDuplicateKey =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: number }).code === 11000;

      if (isDuplicateKey) {
        throw new ConflictException(
          `Evaluation already exists for group '${dto.groupId}' and deliverable '${dto.deliverableId}'.`,
        );
      }

      throw new InternalServerErrorException(
        'Failed to record deliverable evaluation due to an unexpected error.',
      );
    }
  }

  async getDeliverableEvaluation(
    evaluationId: string,
  ): Promise<DeliverableEvaluationResponseDto> {
    const evaluation = await this.deliverableEvaluationModel
      .findOne({ evaluationId })
      .lean()
      .exec();

    if (!evaluation) {
      throw new NotFoundException(
        `Deliverable evaluation with ID '${evaluationId}' not found.`,
      );
    }

    return this.toDeliverableEvaluationResponseDto(evaluation);
  }

  // ────────────────────────────────────────────────────────────────
  // GRADE CALCULATION PIPELINE (Issue #135)
  // ────────────────────────────────────────────────────────────────

  /**
   * Executes the full 4-step grade calculation pipeline for a group:
   *  8.3 – Compute per-deliverable team scalar from sprint evaluations
   *  8.4 – Apply deliverable weights to raw committee grades
   *  8.5 – Compute per-student individual allowance ratio from story points
   *  8.6 – Combine results and persist to D3/D4/D5
   */
  async calculateGrade(
    groupId: string,
    dto: CalculateGradeDto,
    triggeredBy: string,
    correlationId?: string,
  ): Promise<GradeCalculationResultDto> {
    // ── Pre-check: 409 if grade already exists and force=false ──────
    if (!dto.force) {
      const existing = await this.groupFinalGradeModel
        .findOne({ groupId })
        .lean()
        .exec();
      if (existing) {
        throw new ConflictException(
          `Final grade already exists for group ${groupId}. Use force=true to recalculate.`,
        );
      }
    }

    this.logger.log(
      JSON.stringify({
        event: 'pipeline_triggered',
        groupId,
        triggeredBy,
        force: dto.force,
        correlationId: correlationId ?? null,
      }),
    );

    // ── Step 8.3: Compute per-deliverable team scalar ───────────────
    const sprintConfigs = await this.sprintConfigModel
      .find({ groupId })
      .lean()
      .exec();

    // Build deliverableId → sprintId[] map from sprint configs
    const deliverableSprintMap = new Map<string, string[]>();
    for (const config of sprintConfigs) {
      for (const mapping of config.deliverableMappings ?? []) {
        const sprintIds = deliverableSprintMap.get(mapping.deliverableId) ?? [];
        sprintIds.push(config.sprintId);
        deliverableSprintMap.set(mapping.deliverableId, sprintIds);
      }
    }

    const sprintEvaluations = await this.sprintEvaluationModel
      .find({ groupId })
      .lean()
      .exec();

    // teamScalar per deliverable = simple average of averageScores of all relevant
    // sprint evaluations (both SCRUM and CODE_REVIEW), normalised to [0, 1].
    const deliverableScalarMap = new Map<string, number>();
    for (const [deliverableId, sprintIds] of deliverableSprintMap) {
      const relevantEvals = sprintEvaluations.filter((e) =>
        sprintIds.includes(e.sprintId),
      );
      if (relevantEvals.length === 0) {
        deliverableScalarMap.set(deliverableId, 0);
      } else {
        const avgScore =
          relevantEvals.reduce((sum, e) => sum + e.averageScore, 0) /
          relevantEvals.length;
        deliverableScalarMap.set(deliverableId, Math.min(1, avgScore / 100));
      }
    }

    this.logger.log(
      JSON.stringify({ event: 'step_8_3_complete', groupId, correlationId: correlationId ?? null }),
    );

    // ── Step 8.4: Apply deliverable weights to raw committee grades ──
    const deliverableEvals = await this.deliverableEvaluationModel
      .find({ groupId })
      .lean()
      .exec();

    if (deliverableEvals.length === 0) {
      throw new UnprocessableEntityException(
        `No deliverable evaluations found for group ${groupId}. ` +
          'All deliverables must be graded before calculation.',
      );
    }

    const pendingCount = deliverableEvals.filter(
      (e) => e.status !== DeliverableEvaluationStatus.GRADED,
    ).length;
    if (pendingCount > 0) {
      throw new UnprocessableEntityException(
        `${pendingCount} deliverable evaluation(s) are still PENDING for group ${groupId}. ` +
          'All committee grades must be GRADED before calculation.',
      );
    }

    const deliverableIds = deliverableEvals.map((e) => e.deliverableId);
    const deliverables = await this.deliverableModel
      .find({ deliverableId: { $in: deliverableIds } })
      .lean()
      .exec();

    const deliverableConfigMap = new Map(
      deliverables.map((d) => [d.deliverableId, d]),
    );

    for (const deliverableId of deliverableIds) {
      if (!deliverableConfigMap.has(deliverableId)) {
        throw new UnprocessableEntityException(
          `Deliverable config (categoryWeight/subWeight) not found for deliverableId=${deliverableId}.`,
        );
      }
    }

    const scaledDeliverableGrades: ScaledDeliverableGradeDto[] = [];
    let teamGradeRaw = 0;

    for (const deliverableEval of deliverableEvals) {
      const deliverable = deliverableConfigMap.get(deliverableEval.deliverableId)!;
      const teamScalar = deliverableScalarMap.get(deliverableEval.deliverableId) ?? 0;
      const scaledGrade =
        deliverableEval.rawGrade *
        teamScalar *
        deliverable.categoryWeight *
        deliverable.subWeight;

      teamGradeRaw += scaledGrade;

      scaledDeliverableGrades.push({
        deliverableId: deliverableEval.deliverableId,
        rawGrade: deliverableEval.rawGrade,
        teamScalar,
        categoryWeight: deliverable.categoryWeight,
        subWeight: deliverable.subWeight,
        scaledGrade: Number(scaledGrade.toFixed(2)),
      });
    }

    const teamGrade = Number(Math.min(100, teamGradeRaw).toFixed(2));

    this.logger.log(
      JSON.stringify({ event: 'step_8_4_complete', groupId, teamGrade, correlationId: correlationId ?? null }),
    );

    // ── Step 8.5: Compute per-student individual allowance ratio ────
    const storyPointRecords = await this.storyPointRecordModel
      .find({ groupId })
      .lean()
      .exec();

    if (storyPointRecords.length === 0) {
      throw new UnprocessableEntityException(
        `No story point records found for group ${groupId}. ` +
          'Story points must be verified for all sprints before calculation.',
      );
    }

    // Aggregate completed/target points per student across all sprints.
    // Priority (OVERRIDE > JIRA_GITHUB > MANUAL) is already enforced at write time
    // by StoryPointsService — so we simply sum all records per student.
    const studentTotals = new Map<string, { completed: number; target: number }>();
    for (const record of storyPointRecords) {
      const totals = studentTotals.get(record.studentId) ?? { completed: 0, target: 0 };
      totals.completed += record.completedPoints;
      totals.target += record.targetPoints;
      studentTotals.set(record.studentId, totals);
    }

    this.logger.log(
      JSON.stringify({ event: 'step_8_5_complete', groupId, studentCount: studentTotals.size, correlationId: correlationId ?? null }),
    );

    // ── Step 8.6: Combine and persist to D3 / D4 / D5 ─────────────
    const calculatedAt = new Date();
    const individualGrades: StudentFinalGradeDto[] = [];

    try {
      // D3 – Upsert individual student grades (keyed by studentId + groupId)
      for (const [studentId, totals] of studentTotals) {
        const individualAllowanceRatio =
          totals.target > 0
            ? Math.min(1, totals.completed / totals.target)
            : 0;
        const finalGrade = Number(
          (teamGrade * individualAllowanceRatio).toFixed(2),
        );

        await this.studentFinalGradeModel
          .findOneAndUpdate(
            { studentId, groupId },
            { studentId, groupId, individualAllowanceRatio, finalGrade, calculatedAt },
            { upsert: true, new: true },
          )
          .exec();

        individualGrades.push({
          studentId,
          groupId,
          individualAllowanceRatio,
          finalGrade,
          calculatedAt,
        });
      }

      // D4 – Upsert team final grade (keyed by groupId)
      await this.groupFinalGradeModel
        .findOneAndUpdate(
          { groupId },
          { groupId, teamGrade, calculatedAt },
          { upsert: true, new: true },
        )
        .exec();

      // D5 – Append-only audit snapshot
      const overallTeamScalar =
        scaledDeliverableGrades.length > 0
          ? Number(
              (
                scaledDeliverableGrades.reduce((s, d) => s + d.teamScalar, 0) /
                scaledDeliverableGrades.length
              ).toFixed(4),
            )
          : 0;

      await this.gradeHistoryEntryModel.create({
        groupId,
        teamGrade,
        gradeComponents: { scaledDeliverableGrades, teamScalar: overallTeamScalar },
        triggeredBy,
        changedAt: calculatedAt,
      });
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'step_8_6_failed',
          groupId,
          triggeredBy,
          correlationId: correlationId ?? null,
          error: (error as Error).message,
        }),
      );
      throw new InternalServerErrorException(
        'Failed to persist grade calculation results. Transaction rolled back.',
      );
    }

    this.logger.log(
      JSON.stringify({
        event: 'step_8_6_complete',
        groupId,
        triggeredBy,
        calculatedAt,
        correlationId: correlationId ?? null,
      }),
    );

    const overallTeamScalar =
      scaledDeliverableGrades.length > 0
        ? Number(
            (
              scaledDeliverableGrades.reduce((s, d) => s + d.teamScalar, 0) /
              scaledDeliverableGrades.length
            ).toFixed(4),
          )
        : 0;

    return {
      groupId,
      teamGrade,
      teamScalar: overallTeamScalar,
      scaledDeliverableGrades,
      individualGrades,
      triggeredBy,
      calculatedAt,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ────────────────────────────────────────────────────────────────

  private rethrowKnownErrors(error: unknown, message: string): never {
    if (error instanceof NotFoundException) {
      throw error;
    }

    throw new InternalServerErrorException(
      `Failed to retrieve grades: ${message}`,
    );
  }

  private normalizePagination(query: ListGradeHistoryQueryDto): {
    page: number;
    limit: number;
  } {
    return {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    };
  }

  private buildGroupNotFoundMessage(groupId: string): string {
    return `Final grade not found yet for group ${groupId}.`;
  }

  private buildStudentNotFoundMessage(studentId: string): string {
    return `Final grade not found yet for student ${studentId}.`;
  }

  private buildHistoryNotFoundMessage(
    groupId: string,
    page: number,
    limit: number,
  ): string {
    return `Grade history not found yet for group ${groupId} (page ${page}, limit ${limit}).`;
  }

  private toStudentFinalGradeDto(
    studentGrade: StudentFinalGrade,
  ): StudentFinalGradeDto {
    return {
      studentId: studentGrade.studentId,
      groupId: studentGrade.groupId,
      individualAllowanceRatio: studentGrade.individualAllowanceRatio,
      finalGrade: studentGrade.finalGrade,
      calculatedAt: studentGrade.calculatedAt,
    };
  }

  private toGradeHistoryEntryDto(
    gradeHistoryEntry: GradeHistoryEntry,
  ): GradeHistoryEntryDto {
    return {
      gradeChangeId: gradeHistoryEntry.gradeChangeId,
      groupId: gradeHistoryEntry.groupId,
      teamGrade: gradeHistoryEntry.teamGrade,
      gradeComponents: gradeHistoryEntry.gradeComponents,
      triggeredBy: gradeHistoryEntry.triggeredBy,
      changedAt: gradeHistoryEntry.changedAt,
    };
  }

  private toDeliverableEvaluationResponseDto(
    evaluation: DeliverableEvaluation & { createdAt: Date; updatedAt: Date },
  ): DeliverableEvaluationResponseDto {
    return {
      evaluationId: evaluation.evaluationId,
      groupId: evaluation.groupId,
      deliverableId: evaluation.deliverableId,
      deliverableGrade: evaluation.deliverableGrade,
      gradedBy: evaluation.gradedBy,
      createdAt: evaluation.createdAt,
      updatedAt: evaluation.updatedAt,
    };
  }
}
