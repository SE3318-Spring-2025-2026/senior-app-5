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
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ──────────────────────────────────────────────────────────────────────────

  async create(dto: CreateSprintConfigDto): Promise<SprintConfigResponseDto> {
    // 1. Validate all deliverableIds exist in D1 (per spec: D1 first)
    await this.validateDeliverableIds(
      dto.deliverableMappings.map((m) => m.deliverableId),
    );

    // 2. Validate sprintId exists in Schedule API (Process 4)
    await this.validateSprintId(dto.sprintId);

    // 3. Check for duplicate sprint config (409)
    const existing = await this.sprintConfigModel
      .findOne({ sprintId: dto.sprintId })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException(
        `Sprint config for sprintId '${dto.sprintId}' already exists.`,
      );
    }

    // 4. Validate contribution percentage sum per deliverable ≤ 100
    await this.validatePercentageSum(dto.deliverableMappings, null);

    // 5. Persist
    const created = await this.sprintConfigModel.create({
      sprintId: dto.sprintId,
      targetStoryPoints: dto.targetStoryPoints,
      deliverableMappings: dto.deliverableMappings,
    });

    this.logger.log({
      event: 'sprint_config_created',
      sprintId: created.sprintId,
    });

    return this.toResponseDto(created);
  }

  async update(
    sprintId: string,
    dto: UpdateSprintConfigDto,
  ): Promise<SprintConfigResponseDto> {
    // 1. Find existing config (404 if not found)
    const config = await this.sprintConfigModel
      .findOne({ sprintId })
      .exec();
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

    return this.toResponseDto(updated);
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
  private async validateDeliverableIds(deliverableIds: string[]): Promise<void> {
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
    const query = excludeSprintId
      ? { sprintId: { $ne: excludeSprintId } }
      : {};

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

  private toResponseDto(doc: SprintConfigDocument): SprintConfigResponseDto {
    return {
      sprintId: doc.sprintId,
      targetStoryPoints: doc.targetStoryPoints,
      deliverableMappings: doc.deliverableMappings.map((m) => ({
        deliverableId: m.deliverableId,
        contributionPercentage: m.contributionPercentage,
      })),
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
    };
  }
}
