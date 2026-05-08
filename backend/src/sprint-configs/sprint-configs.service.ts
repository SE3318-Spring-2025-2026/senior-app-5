import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SprintConfigEntry,
  SprintConfigDocument,
} from './schemas/sprint-config.schema';
import {
  Deliverable,
  DeliverableDocument,
} from '../deliverables/schemas/deliverable.schema';
import {
  Schedule,
  ScheduleDocument,
} from '../advisors/schemas/schedule.schema';
import { Team, TeamDocument } from '../teams/schemas/team.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateSprintConfigDto } from './dto/create-sprint-config.dto';
import { UpdateSprintConfigDto } from './dto/update-sprint-config.dto';
import { SprintConfigResponseDto } from './dto/sprint-config-response.dto';

@Injectable()
export class SprintConfigsService {
  private readonly logger = new Logger(SprintConfigsService.name);

  constructor(
    @InjectModel(SprintConfigEntry.name)
    private readonly sprintConfigModel: Model<SprintConfigDocument>,
    @InjectModel(Deliverable.name)
    private readonly deliverableModel: Model<DeliverableDocument>,
    @InjectModel(Schedule.name)
    private readonly scheduleModel: Model<ScheduleDocument>,
    @InjectModel(Team.name)
    private readonly teamModel: Model<TeamDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ──────────────────────────────────────────────────────────────────────────

  async create(dto: CreateSprintConfigDto): Promise<SprintConfigResponseDto> {
    const resolvedSprintId = dto.sprintId?.trim() || randomUUID();

    // 1. Validate all deliverableIds exist in D1 (per spec: D1 first)
    await this.validateDeliverableIds(
      dto.deliverableMappings.map((m) => m.deliverableId),
    );

    // 2. If caller provided a sprintId, validate it exists in Schedule API
    if (dto.sprintId?.trim()) {
      await this.validateSprintId(resolvedSprintId);
    }

    // 3. Check for duplicate sprint config (409)
    const existing = await this.sprintConfigModel
      .findOne({ sprintId: resolvedSprintId })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException(
        `Sprint config for sprintId '${resolvedSprintId}' already exists.`,
      );
    }

    // 4. Validate contribution percentage sum per deliverable ≤ 100
    await this.validatePercentageSum(dto.deliverableMappings, null);

    // 5. Persist
    const created = await this.sprintConfigModel.create({
      sprintId: resolvedSprintId,
      targetStoryPoints: dto.targetStoryPoints,
      deliverableMappings: dto.deliverableMappings,
    });

    this.logger.log({
      event: 'sprint_config_created',
      sprintId: created.sprintId,
    });

    await this.notifyTeamLeadersAboutSprint(created.sprintId);

    return this.toResponseDto(created);
  }

  async update(
    sprintId: string,
    dto: UpdateSprintConfigDto,
  ): Promise<SprintConfigResponseDto> {
    // 1. Find existing config (404 if not found)
    const config = await this.sprintConfigModel.findOne({ sprintId }).exec();
    if (!config) {
      throw new NotFoundException(
        `Sprint config for sprintId '${sprintId}' not found.`,
      );
    }

    // 2. If deliverableMappings provided, validate deliverableIds
    if (dto.deliverableMappings !== undefined) {
      await this.validateDeliverableIds(
        dto.deliverableMappings.map((m) => m.deliverableId),
      );

      // 3. Validate contribution percentage sum per deliverable ≤ 100
      await this.validatePercentageSum(dto.deliverableMappings, sprintId);
    }

    // 4. Apply partial updates
    if (dto.targetStoryPoints !== undefined) {
      config.targetStoryPoints = dto.targetStoryPoints;
    }
    if (dto.deliverableMappings !== undefined) {
      config.deliverableMappings = dto.deliverableMappings;
    }

    const updated = await config.save();

    this.logger.log({
      event: 'sprint_config_updated',
      sprintId: updated.sprintId,
    });

    await this.notifyTeamLeadersAboutSprint(updated.sprintId);

    return this.toResponseDto(updated);
  }

  /**
   * Fan out an in-app notification to every team leader so they know to open
   * a matching sprint in their own JIRA instance for this date range.
   * Best-effort: a notification failure must not roll back the sprint write.
   */
  private async notifyTeamLeadersAboutSprint(sprintId: string): Promise<void> {
    try {
      const schedule = await this.scheduleModel
        .findOne({ scheduleId: sprintId })
        .lean()
        .exec();
      if (!schedule) {
        this.logger.warn(
          `Skipping sprint notification: no Schedule found for sprintId '${sprintId}'.`,
        );
        return;
      }

      const teams = await this.teamModel
        .find({ leaderId: { $exists: true, $ne: '' } })
        .select('leaderId name')
        .lean()
        .exec();

      const sprintName = `Sprint ${sprintId.slice(0, 8)}`;
      await Promise.allSettled(
        teams.map((t) =>
          this.notificationsService.notifySprintScheduled({
            recipientUserId: t.leaderId,
            sprintId,
            sprintName,
            startDate: schedule.startDatetime,
            endDate: schedule.endDatetime,
          }),
        ),
      );
    } catch (err) {
      this.logger.error({
        event: 'sprint_notification_failed',
        sprintId,
        error: (err as Error).message,
      });
    }
  }

  async findAll(
    page = 1,
    limit = 20,
  ): Promise<{
    data: SprintConfigResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.sprintConfigModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.sprintConfigModel.countDocuments().exec(),
    ]);
    return {
      data: docs.map((d) => this.toResponseDto(d as SprintConfigDocument)),
      total,
      page,
      limit,
    };
  }

  async findOne(sprintId: string): Promise<SprintConfigResponseDto> {
    const doc = await this.sprintConfigModel
      .findOne({ sprintId })
      .lean()
      .exec();
    if (!doc) {
      throw new NotFoundException(
        `Sprint config for sprintId '${sprintId}' not found.`,
      );
    }
    return this.toResponseDto(doc as SprintConfigDocument);
  }

  async remove(sprintId: string): Promise<void> {
    const result = await this.sprintConfigModel.deleteOne({ sprintId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(
        `Sprint config for sprintId '${sprintId}' not found.`,
      );
    }
    this.logger.log({ event: 'sprint_config_deleted', sprintId });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Validates that the sprintId exists as a scheduleId in the Schedule collection.
   * Throws 400 if not found, 500 if the lookup itself fails unexpectedly.
   */
  private async validateSprintId(sprintId: string): Promise<void> {
    try {
      const schedule = await this.scheduleModel
        .findOne({ scheduleId: sprintId })
        .lean()
        .exec();
      if (!schedule) {
        throw new BadRequestException(
          `sprintId '${sprintId}' does not exist in the Schedule API.`,
        );
      }
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error({
        event: 'sprint_id_validation_failed',
        sprintId,
        error: (err as Error).message,
      });
      throw new InternalServerErrorException(
        'Failed to validate sprintId against the Schedule service.',
      );
    }
  }

  /**
   * Validates all deliverableIds exist in D1 (Deliverable collection).
   * Throws 400 if any are missing.
   */
  private async validateDeliverableIds(
    deliverableIds: string[],
  ): Promise<void> {
    const unique = [...new Set(deliverableIds)];
    const found = await this.deliverableModel
      .find({ deliverableId: { $in: unique } })
      .select('deliverableId')
      .lean()
      .exec();

    const foundIds = new Set(found.map((d) => d.deliverableId));
    const missing = unique.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `The following deliverableId(s) do not exist in D1: ${missing.join(', ')}.`,
      );
    }
  }

  /**
   * Validates that the sum of contributionPercentage for each deliverable
   * across ALL sprint configs (excluding `excludeSprintId` if provided) does
   * not exceed 100.
   *
   * @param mappings   - the mappings being submitted
   * @param excludeSprintId - sprintId of the config being updated (null for POST)
   */
  private async validatePercentageSum(
    mappings: { deliverableId: string; contributionPercentage: number }[],
    excludeSprintId: string | null,
  ): Promise<void> {
    // Aggregate existing percentages per deliverable (excluding the current sprint if updating)
    const query = excludeSprintId ? { sprintId: { $ne: excludeSprintId } } : {};

    const existingConfigs = await this.sprintConfigModel
      .find(query)
      .select('deliverableMappings')
      .lean()
      .exec();

    // Build map: deliverableId → total existing percentage
    const existingTotals = new Map<string, number>();
    for (const config of existingConfigs) {
      for (const m of config.deliverableMappings ?? []) {
        existingTotals.set(
          m.deliverableId,
          (existingTotals.get(m.deliverableId) ?? 0) + m.contributionPercentage,
        );
      }
    }

    // Add incoming mappings and check totals
    const incomingTotals = new Map<string, number>();
    for (const m of mappings) {
      incomingTotals.set(
        m.deliverableId,
        (incomingTotals.get(m.deliverableId) ?? 0) + m.contributionPercentage,
      );
    }

    const violations: string[] = [];
    for (const [deliverableId, incomingTotal] of incomingTotals) {
      const existingTotal = existingTotals.get(deliverableId) ?? 0;
      if (existingTotal + incomingTotal > 100) {
        violations.push(
          `deliverableId '${deliverableId}': total would be ${existingTotal + incomingTotal}%`,
        );
      }
    }

    if (violations.length > 0) {
      throw new UnprocessableEntityException(
        `Contribution percentage sum exceeds 100% for: ${violations.join('; ')}.`,
      );
    }
  }

  private toResponseDto(
    doc: SprintConfigDocument & { createdAt?: Date; updatedAt?: Date },
  ): SprintConfigResponseDto {
    return {
      sprintId: doc.sprintId,
      targetStoryPoints: doc.targetStoryPoints,
      deliverableMappings: doc.deliverableMappings.map((m) => ({
        deliverableId: m.deliverableId,
        contributionPercentage: m.contributionPercentage,
      })),
      createdAt: doc.createdAt ?? new Date(),
      updatedAt: doc.updatedAt ?? new Date(),
    };
  }
}
