import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateDeliverableDto } from './dto/create-deliverable.dto';
import { ListDeliverablesQueryDto } from './dto/list-deliverables-query.dto';
import {
  DeliverableResponseDto,
  PaginatedDeliverablesDto,
} from './dto/deliverable-response.dto';
import { UpdateDeliverableDto } from './dto/update-deliverable.dto';
import {
  Deliverable,
  DeliverableDocument,
} from './schemas/deliverable.schema';

@Injectable()
export class DeliverablesService {
  private readonly logger = new Logger(DeliverablesService.name);

  constructor(
    @InjectModel(Deliverable.name)
    private readonly deliverableModel: Model<DeliverableDocument>,
  ) {}

  async listDeliverables(
    query: ListDeliverablesQueryDto,
    correlationId?: string,
  ): Promise<PaginatedDeliverablesDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    try {
      const [data, total] = await Promise.all([
        this.deliverableModel
          .find()
          .sort({ createdAt: 1, deliverableId: 1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.deliverableModel.countDocuments().exec(),
      ]);

      this.logger.log(
        JSON.stringify({
          event: 'deliverable.listed',
          page,
          limit,
          resultCount: data.length,
          correlationId: correlationId ?? null,
        }),
      );

      return {
        data: data.map((deliverable) => this.toResponseDto(deliverable)),
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'deliverable.list_failed',
          correlationId: correlationId ?? null,
          error: (error as Error).message,
        }),
      );
      throw new InternalServerErrorException(
        'Failed to retrieve deliverables due to an unexpected error.',
      );
    }
  }

  async createDeliverable(
    dto: CreateDeliverableDto,
    actorId: string,
    correlationId?: string,
  ): Promise<DeliverableResponseDto> {
    try {
      await this.ensureUniqueName(dto.name, undefined);
      await this.ensurePercentageBudget(dto.deliverablePercentage, undefined);

      const created = new this.deliverableModel({
        name: dto.name.trim(),
        deliverablePercentage: dto.deliverablePercentage,
      });
      await created.save();

      this.logger.log(
        JSON.stringify({
          event: 'deliverable.created',
          deliverableId: created.deliverableId,
          actorId,
          correlationId: correlationId ?? null,
        }),
      );

      return this.toResponseDto(created.toObject());
    } catch (error) {
      throw this.toWriteException(error, correlationId);
    }
  }

  async updateDeliverable(
    deliverableId: string,
    dto: UpdateDeliverableDto,
    actorId: string,
    correlationId?: string,
  ): Promise<DeliverableResponseDto> {
    try {
      const existing = await this.deliverableModel
        .findOne({ deliverableId })
        .exec();

      if (!existing) {
        throw new NotFoundException(
          `Deliverable with ID '${deliverableId}' not found.`,
        );
      }

      if (dto.name !== undefined) {
        await this.ensureUniqueName(dto.name, deliverableId);
        existing.name = dto.name.trim();
      }

      const updatedPercentage =
        dto.deliverablePercentage ?? existing.deliverablePercentage;

      await this.ensurePercentageBudget(updatedPercentage, deliverableId);

      if (dto.deliverablePercentage !== undefined) {
        existing.deliverablePercentage = dto.deliverablePercentage;
      }

      await existing.save();

      this.logger.log(
        JSON.stringify({
          event: 'deliverable.updated',
          deliverableId,
          actorId,
          correlationId: correlationId ?? null,
        }),
      );

      return this.toResponseDto(existing.toObject());
    } catch (error) {
      throw this.toWriteException(error, correlationId);
    }
  }

  async deleteDeliverable(
    deliverableId: string,
    actorId: string,
    correlationId?: string,
  ): Promise<void> {
    const result = await this.deliverableModel
      .deleteOne({ deliverableId })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(
        `Deliverable with ID '${deliverableId}' not found.`,
      );
    }

    this.logger.log(
      JSON.stringify({
        event: 'deliverable.deleted',
        deliverableId,
        actorId,
        correlationId: correlationId ?? null,
      }),
    );
  }

  private async ensureUniqueName(
    name: string,
    excludedDeliverableId: string | undefined,
  ): Promise<void> {
    const existing = await this.deliverableModel
      .findOne({ name: name.trim() })
      .lean()
      .exec();

    if (
      existing &&
      (!excludedDeliverableId || existing.deliverableId !== excludedDeliverableId)
    ) {
      throw new ConflictException(
        `Deliverable with name '${name.trim()}' already exists.`,
      );
    }
  }

  private async ensurePercentageBudget(
    nextPercentage: number,
    excludedDeliverableId: string | undefined,
  ): Promise<void> {
    const deliverables = await this.deliverableModel
      .find(
        excludedDeliverableId
          ? { deliverableId: { $ne: excludedDeliverableId } }
          : {},
        { deliverablePercentage: 1, _id: 0 },
      )
      .lean()
      .exec();

    const total =
      deliverables.reduce(
        (sum, deliverable) => sum + deliverable.deliverablePercentage,
        0,
      ) + nextPercentage;

    if (total > 100) {
      throw new UnprocessableEntityException(
        'Deliverable percentage total cannot exceed 100.',
      );
    }
  }

  private toWriteException(
    error: unknown,
    correlationId?: string,
  ): Error {
    if (
      error instanceof ConflictException ||
      error instanceof NotFoundException ||
      error instanceof UnprocessableEntityException
    ) {
      return error;
    }

    const isDuplicateKey =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 11000;

    this.logger.error(
      JSON.stringify({
        event: 'deliverable.write_failed',
        correlationId: correlationId ?? null,
        error: (error as Error).message,
      }),
    );

    if (isDuplicateKey) {
      return new ConflictException('Deliverable name must be unique.');
    }

    return new InternalServerErrorException(
      'Failed to persist deliverable due to an unexpected error.',
    );
  }

  private toResponseDto(deliverable: Deliverable): DeliverableResponseDto {
    return {
      deliverableId: deliverable.deliverableId,
      name: deliverable.name,
      deliverablePercentage: deliverable.deliverablePercentage,
      createdAt: (deliverable as Deliverable & { createdAt: Date }).createdAt,
      updatedAt:
        ((deliverable as Deliverable & { updatedAt?: Date | null }).updatedAt ??
          null),
    };
  }
}
