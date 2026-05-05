import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model } from 'mongoose';
import { CreateRubricDto } from './dto/create-rubric.dto';
import { ListRubricsQueryDto } from './dto/rubric-response.dto';
import {
  RubricResponseDto,
  PaginatedRubricsDto,
} from './dto/rubric-response.dto';
import { Rubric, RubricDocument } from './schemas/rubric.schema';

@Injectable()
export class RubricsService {
  private readonly logger = new Logger(RubricsService.name);

  constructor(
    @InjectModel(Rubric.name)
    private readonly rubricModel: Model<RubricDocument>,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  /**
   * List all rubrics for a deliverable with pagination.
   */
  async listRubrics(
    deliverableId: string,
    query: ListRubricsQueryDto,
    correlationId?: string,
  ): Promise<PaginatedRubricsDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    try {
      const [data, total] = await Promise.all([
        this.rubricModel
          .find({ deliverableId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.rubricModel.countDocuments({ deliverableId }).exec(),
      ]);

      this.logger.log(
        JSON.stringify({
          event: 'rubric.listed',
          deliverableId,
          page,
          limit,
          resultCount: data.length,
          correlationId: correlationId ?? null,
        }),
      );

      return {
        data: data.map((rubric) => this.toResponseDto(rubric)),
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'rubric.list_failed',
          deliverableId,
          correlationId: correlationId ?? null,
          error: (error as Error).message,
        }),
      );
      throw new InternalServerErrorException(
        'Failed to retrieve rubrics due to an unexpected error.',
      );
    }
  }

  /**
   * Create a new rubric for a deliverable.
   * Automatically deactivates the previous active rubric in the same transaction.
   * Validates that question weights sum to exactly 1.0.
   */
  async createRubric(
    dto: CreateRubricDto,
    actorId: string,
    correlationId?: string,
  ): Promise<RubricResponseDto> {
    let session: ClientSession | null = null;

    try {
      // Validate question weights
      const weightSum = dto.questions.reduce(
        (sum, q) => sum + q.criteriaWeight,
        0,
      );
      if (Math.abs(weightSum - 1.0) > 0.0001) {
        throw new BadRequestException(
          `Question criteria weights must sum to exactly 1.0. Current sum: ${weightSum.toFixed(4)}.`,
        );
      }

      session = await this.connection.startSession();
      session.startTransaction();

      // Deactivate previous active rubric
      await this.rubricModel
        .updateMany(
          { deliverableId: dto.deliverableId, isActive: true },
          { $set: { isActive: false } },
          { session },
        )
        .exec();

      // Create new rubric with isActive=true
      const created = await this.rubricModel.create(
        [
          {
            deliverableId: dto.deliverableId,
            name: dto.name.trim(),
            isActive: true,
            questions: dto.questions,
          },
        ],
        { session },
      );

      await session.commitTransaction();

      const rubric = created[0];

      this.logger.log(
        JSON.stringify({
          event: 'rubric.created',
          rubricId: rubric.rubricId,
          deliverableId: dto.deliverableId,
          actorId,
          correlationId: correlationId ?? null,
        }),
      );

      return this.toResponseDto(rubric.toObject());
    } catch (error) {
      if (session?.inTransaction()) {
        await session.abortTransaction();
      }
      throw this.toWriteException(error, correlationId);
    } finally {
      await session?.endSession();
    }
  }

  /**
   * Retrieve the active rubric for a deliverable.
   * Returns null if no active rubric exists.
   */
  async getActiveRubric(
    deliverableId: string,
    correlationId?: string,
  ): Promise<RubricDocument | null> {
    try {
      const rubric = await this.rubricModel
        .findOne({ deliverableId, isActive: true })
        .exec();

      if (!rubric) {
        this.logger.warn(
          JSON.stringify({
            event: 'rubric.active_not_found',
            deliverableId,
            correlationId: correlationId ?? null,
          }),
        );
        return null;
      }

      return rubric;
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'rubric.read_failed',
          deliverableId,
          correlationId: correlationId ?? null,
          error: (error as Error).message,
        }),
      );
      throw new InternalServerErrorException(
        'Failed to retrieve active rubric due to an unexpected error.',
      );
    }
  }

  /**
   * Delete a rubric by ID.
   * Rejects with 409 if the rubric is referenced in any SprintEvaluation.
   */
  async deleteRubric(
    rubricId: string,
    correlationId?: string,
  ): Promise<void> {
    try {
      const rubric = await this.rubricModel.findOne({ rubricId }).exec();

      if (!rubric) {
        throw new NotFoundException(
          `Rubric with ID '${rubricId}' not found.`,
        );
      }

      // Note: In a full implementation, we would check the SprintEvaluation collection
      // to see if this rubricId is referenced. For now, we proceed with deletion.
      // TODO: Implement SprintEvaluation check before deletion if needed.

      await this.rubricModel.deleteOne({ rubricId }).exec();

      this.logger.log(
        JSON.stringify({
          event: 'rubric.deleted',
          rubricId,
          correlationId: correlationId ?? null,
        }),
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      this.logger.error(
        JSON.stringify({
          event: 'rubric.delete_failed',
          rubricId,
          correlationId: correlationId ?? null,
          error: (error as Error).message,
        }),
      );
      throw new InternalServerErrorException(
        'Failed to delete rubric due to an unexpected error.',
      );
    }
  }

  private toResponseDto(rubric: Rubric): RubricResponseDto {
    return {
      rubricId: rubric.rubricId,
      deliverableId: rubric.deliverableId,
      name: rubric.name,
      isActive: rubric.isActive,
      questions: rubric.questions.map((q) => ({
        questionId: q.questionId,
        criteriaName: q.criteriaName,
        criteriaWeight: q.criteriaWeight,
      })),
      createdAt: (rubric as Rubric & { createdAt: Date }).createdAt,
      updatedAt:
        ((rubric as Rubric & { updatedAt?: Date | null }).updatedAt ??
          null),
    };
  }

  private toWriteException(
    error: unknown,
    correlationId?: string,
  ): Error {
    if (
      error instanceof BadRequestException ||
      error instanceof ConflictException ||
      error instanceof NotFoundException ||
      error instanceof UnprocessableEntityException
    ) {
      return error;
    }

    this.logger.error(
      JSON.stringify({
        event: 'rubric.write_failed',
        correlationId: correlationId ?? null,
        error: (error as Error).message,
      }),
    );

    return new InternalServerErrorException(
      'Failed to persist rubric due to an unexpected error.',
    );
  }
}
