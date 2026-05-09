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
  DeliverableEvaluationDocument,
  DeliverableEvaluationStatus,
  deliverableGradeValue,
} from './schemas/deliverable-evaluation.schema';
import {
  SprintEvaluation,
  SprintEvaluationDocument,
  SprintEvaluationType,
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
import {
  Committee,
  CommitteeDocument,
} from '../committees/schemas/committee.schema';
import { User, UserDocument } from '../users/data/user.schema';
import { Role } from '../auth/enums/role.enum';

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
    @InjectModel(Committee.name)
    private readonly committeeModel: Model<CommitteeDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
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

  async aggregateCommitteeGrades(committeeId: string): Promise<{
    committeeId: string;
    groups: {
      groupId: string;
      evaluations: DeliverableEvaluationResponseDto[];
      averageGrade: number | null;
    }[];
  }> {
    const committee = await this.committeeModel
      .findOne({ id: committeeId })
      .lean()
      .exec();
    if (!committee) {
      throw new NotFoundException(
        `Committee with ID '${committeeId}' not found.`,
      );
    }

    const groupIds = (committee.groups as { groupId: string }[]).map(
      (g) => g.groupId,
    );

    const groups = await Promise.all(
      groupIds.map(async (groupId) => {
        const evals = await this.deliverableEvaluationModel
          .find({ groupId })
          .sort({ createdAt: -1 })
          .lean()
          .exec();

        const dtos = evals.map((e) =>
          this.toDeliverableEvaluationResponseDto(
            e as unknown as DeliverableEvaluation & {
              createdAt: Date;
              updatedAt: Date;
            },
          ),
        );

        const averageGrade =
          dtos.length > 0
            ? dtos.reduce(
                (sum, e) => sum + deliverableGradeValue(e.deliverableGrade),
                0,
              ) / dtos.length
            : null;

        return { groupId, evaluations: dtos, averageGrade };
      }),
    );

    return { committeeId, groups };
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

    const group = await this.groupModel
      .findOne({ groupId: dto.groupId })
      .lean()
      .exec();
    if (!group || group.assignmentStatus !== GroupAssignmentStatus.ASSIGNED) {
      throw new BadRequestException(
        `Group '${dto.groupId}' must exist and be in ASSIGNED state.`,
      );
    }

    const upserted = await this.deliverableEvaluationModel
      .findOneAndUpdate(
        { groupId: dto.groupId, deliverableId: dto.deliverableId },
        {
          $set: {
            deliverableGrade: dto.deliverableGrade,
            rawGrade: deliverableGradeValue(dto.deliverableGrade),
            status: DeliverableEvaluationStatus.GRADED,
            gradedBy,
          },
        },
        { upsert: true, new: true },
      )
      .lean()
      .exec();

    return this.toDeliverableEvaluationResponseDto(
      upserted as unknown as DeliverableEvaluation & {
        createdAt: Date;
        updatedAt: Date;
      },
    );
  }

  async listDeliverableEvaluations(
    filters: { groupId?: string; deliverableId?: string },
    page = 1,
    limit = 20,
  ): Promise<{
    data: DeliverableEvaluationResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query: Record<string, string> = {};
    if (filters.groupId) query.groupId = filters.groupId;
    if (filters.deliverableId) query.deliverableId = filters.deliverableId;

    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.deliverableEvaluationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.deliverableEvaluationModel.countDocuments(query).exec(),
    ]);

    return {
      data: docs.map((d) =>
        this.toDeliverableEvaluationResponseDto(
          d as unknown as DeliverableEvaluation & {
            createdAt: Date;
            updatedAt: Date;
          },
        ),
      ),
      total,
      page,
      limit,
    };
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

    return this.toDeliverableEvaluationResponseDto(
      evaluation as unknown as DeliverableEvaluation & {
        createdAt: Date;
        updatedAt: Date;
      },
    );
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

    // teamScalar per deliverable:
    //   scrum_avg  = AVG(Point_A / SCRUM evaluations for contributing sprints)
    //   review_avg = AVG(Point_B / CODE_REVIEW evaluations for contributing sprints)
    //   scalar     = AVG(scrum_avg, review_avg) / 100   →  capped at 1.0
    const deliverableScalarMap = new Map<string, number>();
    for (const [deliverableId, sprintIds] of deliverableSprintMap) {
      const relevantEvals = sprintEvaluations.filter((e) =>
        sprintIds.includes(e.sprintId),
      );
      if (relevantEvals.length === 0) {
        deliverableScalarMap.set(deliverableId, 0);
        continue;
      }

      const scrumEvals = relevantEvals.filter(
        (e) => e.evaluationType === SprintEvaluationType.SCRUM,
      );
      const reviewEvals = relevantEvals.filter(
        (e) => e.evaluationType === SprintEvaluationType.CODE_REVIEW,
      );

      const scrumAvg =
        scrumEvals.length > 0
          ? scrumEvals.reduce((s, e) => s + e.averageScore, 0) / scrumEvals.length
          : 0;
      const reviewAvg =
        reviewEvals.length > 0
          ? reviewEvals.reduce((s, e) => s + e.averageScore, 0) / reviewEvals.length
          : 0;

      // If only one type exists, use it alone rather than averaging with 0
      const divisor = (scrumEvals.length > 0 ? 1 : 0) + (reviewEvals.length > 0 ? 1 : 0);
      const combined = divisor > 0 ? (scrumAvg + reviewAvg) / divisor : 0;

      deliverableScalarMap.set(deliverableId, Math.min(1, combined / 100));
    }

    this.logger.log(
      JSON.stringify({
        event: 'step_8_3_complete',
        groupId,
        correlationId: correlationId ?? null,
      }),
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
          `Deliverable config not found for deliverableId=${deliverableId}.`,
        );
      }
    }

    const scaledDeliverableGrades: ScaledDeliverableGradeDto[] = [];
    let teamGradeRaw = 0;

    for (const deliverableEval of deliverableEvals) {
      const deliverable = deliverableConfigMap.get(
        deliverableEval.deliverableId,
      )!;
      const teamScalar =
        deliverableScalarMap.get(deliverableEval.deliverableId) ?? 0;
      const scaledGrade =
        deliverableEval.rawGrade *
        teamScalar *
        (deliverable.deliverablePercentage / 100);

      teamGradeRaw += scaledGrade;

      scaledDeliverableGrades.push({
        deliverableId: deliverableEval.deliverableId,
        rawGrade: deliverableEval.rawGrade,
        teamScalar,
        deliverablePercentage: deliverable.deliverablePercentage,
        scaledGrade: Number(scaledGrade.toFixed(2)),
      });
    }

    const teamGrade = Number(Math.min(100, teamGradeRaw).toFixed(2));

    this.logger.log(
      JSON.stringify({
        event: 'step_8_4_complete',
        groupId,
        teamGrade,
        correlationId: correlationId ?? null,
      }),
    );

    // ── Step 8.5: Compute per-student per-deliverable individual ratio ─
    //
    // individual_ratio[sprint] = min(1, completedPoints / targetPoints)
    //
    // individual_ratio_for_deliverable =
    //   SUM( individual_ratio[sprint] × sprint_weight[sprint][deliverable] )
    //   for each sprint contributing to that deliverable
    //
    // sprint_weight = contributionPercentage / 100  (from SprintConfig.deliverableMappings)
    const storyPointRecords = await this.storyPointRecordModel
      .find({ groupId })
      .lean()
      .exec();

    // When no story point records exist yet, fall back to group members with ratio = 1.0
    // so that deliverable-only grading still produces a student grade record.
    let fallbackStudentIds: string[] = [];
    if (storyPointRecords.length === 0) {
      const groupMembers = await this.userModel
        .find({ teamId: groupId })
        .select('_id')
        .lean()
        .exec();
      if (groupMembers.length > 0) {
        fallbackStudentIds = groupMembers.map((u) => String((u as any)._id));
      } else {
        // Last resort: use the group leader
        const grp = await this.groupModel.findOne({ groupId }).lean().exec();
        if (grp?.leaderUserId) fallbackStudentIds = [grp.leaderUserId];
      }
    }

    // Build sprint → deliverable weight map from SprintConfig deliverableMappings
    const sprintDeliverableWeights = new Map<string, Map<string, number>>();
    for (const config of sprintConfigs) {
      const weightMap = new Map<string, number>();
      for (const mapping of config.deliverableMappings ?? []) {
        weightMap.set(mapping.deliverableId, mapping.contributionPercentage / 100);
      }
      sprintDeliverableWeights.set(config.sprintId, weightMap);
    }

    // Per-sprint individual ratio per student
    const sprintRatioMap = new Map<string, Map<string, number>>();
    for (const record of storyPointRecords) {
      const ratio =
        record.targetPoints > 0
          ? Math.min(1, record.completedPoints / record.targetPoints)
          : 0;
      const byStudent = sprintRatioMap.get(record.sprintId) ?? new Map<string, number>();
      byStudent.set(record.studentId, ratio);
      sprintRatioMap.set(record.sprintId, byStudent);
    }

    // Collect all unique student IDs (fallback when no story points)
    const allStudentIds = storyPointRecords.length > 0
      ? [...new Set(storyPointRecords.map((r) => r.studentId))]
      : fallbackStudentIds;

    // Per-student per-deliverable individual ratio
    // studentDeliverableRatioMap: studentId → deliverableId → ratio
    const studentDeliverableRatioMap = new Map<string, Map<string, number>>();
    for (const studentId of allStudentIds) {
      const deliverableRatios = new Map<string, number>();
      for (const [deliverableId] of deliverableSprintMap) {
        const sprintIds = deliverableSprintMap.get(deliverableId) ?? [];
        let weightedRatio = 0;
        for (const sprintId of sprintIds) {
          const weight =
            sprintDeliverableWeights.get(sprintId)?.get(deliverableId) ?? 0;
          const ratio = sprintRatioMap.get(sprintId)?.get(studentId) ?? 0;
          weightedRatio += ratio * weight;
        }
        deliverableRatios.set(deliverableId, Math.min(1, weightedRatio));
      }
      studentDeliverableRatioMap.set(studentId, deliverableRatios);
    }

    // Fallback aggregate ratio (used when no deliverable mapping exists for a sprint)
    const studentTotals = new Map<string, { completed: number; target: number }>();
    if (storyPointRecords.length > 0) {
      for (const record of storyPointRecords) {
        const totals = studentTotals.get(record.studentId) ?? { completed: 0, target: 0 };
        totals.completed += record.completedPoints;
        totals.target += record.targetPoints;
        studentTotals.set(record.studentId, totals);
      }
    } else {
      // No story points: seed fallback students with full ratio (target === 0 → ratio = 1.0 below)
      for (const sid of fallbackStudentIds) {
        studentTotals.set(sid, { completed: 0, target: 0 });
      }
    }

    this.logger.log(
      JSON.stringify({
        event: 'step_8_5_complete',
        groupId,
        studentCount: studentTotals.size,
        correlationId: correlationId ?? null,
      }),
    );

    // ── Step 8.6: Combine and persist to D3 / D4 / D5 ─────────────
    const calculatedAt = new Date();
    const individualGrades: StudentFinalGradeDto[] = [];

    try {
      // D3 – Upsert individual student grades (keyed by studentId + groupId)
      for (const [studentId, totals] of studentTotals) {
        // Use per-deliverable weighted individual ratio when available.
        // The effective student grade is the weighted sum of scaled deliverable grades
        // each multiplied by the student's individual ratio for that deliverable.
        const deliverableRatios = studentDeliverableRatioMap.get(studentId);
        let individualAllowanceRatio: number;

        if (deliverableRatios && deliverableRatios.size > 0 && scaledDeliverableGrades.length > 0) {
          // student_final = SUM( scaled_deliverable_grade[d] × individual_ratio[d] ) / teamGrade
          // Then express as a ratio relative to teamGrade so finalGrade = teamGrade × ratio is correct
          let weightedStudentGrade = 0;
          for (const sdg of scaledDeliverableGrades) {
            const ratio = deliverableRatios.get(sdg.deliverableId) ?? 0;
            weightedStudentGrade += sdg.scaledGrade * ratio;
          }
          individualAllowanceRatio = teamGrade > 0
            ? Math.min(1, weightedStudentGrade / teamGrade)
            : 0;
        } else {
          // Fallback: aggregate ratio across all sprints
          // target === 0 means no story point data → treat as full participation (1.0)
          individualAllowanceRatio =
            totals.target > 0 ? Math.min(1, totals.completed / totals.target) : 1.0;
        }

        const finalGrade = Number(
          (teamGrade * individualAllowanceRatio).toFixed(2),
        );

        await this.studentFinalGradeModel
          .findOneAndUpdate(
            { studentId, groupId },
            {
              studentId,
              groupId,
              individualAllowanceRatio,
              finalGrade,
              calculatedAt,
            },
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
        gradeComponents: {
          scaledDeliverableGrades,
          teamScalar: overallTeamScalar,
        },
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
