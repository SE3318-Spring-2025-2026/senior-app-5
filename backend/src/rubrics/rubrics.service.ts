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
import {
  Deliverable,
  DeliverableDocument,
} from '../deliverables/schemas/deliverable.schema';
import {
  SprintEvaluation,
  SprintEvaluationDocument,
} from '../sprint-evaluations/schemas/sprint-evaluation.schema';

@Injectable()
export class RubricsService {
  private readonly logger = new Logger(RubricsService.name);

  constructor(
    @InjectModel(Rubric.name)
    private readonly rubricModel: Model<RubricDocument>,
    @InjectModel(Deliverable.name)
    private readonly deliverableModel: Model<DeliverableDocument>,
    @InjectModel(SprintEvaluation.name)
    private readonly evaluationModel: Model<SprintEvaluationDocument>,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  /**
   * List rubrics for a deliverable.
   * If activeOnly=true, returns only the currently active rubric.
   */
  async listRubrics(
    deliverableId: string,
    query: ListRubricsQueryDto,
    correlationId?: string,
  ): Promise<RubricResponseDto[]> {
    try {
      const deliverableExists = await this.deliverableModel.exists({
        deliverableId,
      });
      if (!deliverableExists) {
        throw new NotFoundException(
          `Deliverable with ID '${deliverableId}' not found.`,
        );
      }

      const filter: any = { deliverableId };
      if (query.activeOnly) {
        filter.isActive = true;
      }

      const rubrics = await this.rubricModel
        .find(filter)
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      this.logger.log(
        JSON.stringify({
          event: 'rubric.listed',
          deliverableId,
          activeOnly: query.activeOnly,
          resultCount: rubrics.length,
          correlationId: correlationId ?? null,
        }),
      );

      return rubrics.map((rubric) => this.toResponseDto(rubric as Rubric));
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
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
      const deliverableExists = await this.deliverableModel.exists({
        deliverableId: dto.deliverableId,
      });
      if (!deliverableExists) {
        throw new NotFoundException(
          `Deliverable with ID '${dto.deliverableId}' not found.`,
        );
      }

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
    deliverableId: string,
    rubricId: string,
    correlationId?: string,
  ): Promise<void> {
    try {
      const deliverableExists = await this.deliverableModel.exists({
        deliverableId,
      });
      if (!deliverableExists) {
        throw new NotFoundException(
          `Deliverable with ID '${deliverableId}' not found.`,
        );
      }

      const rubric = await this.rubricModel
        .findOne({ rubricId, deliverableId })
        .exec();

      if (!rubric) {
        throw new NotFoundException(
          `Rubric with ID '${rubricId}' not found.`,
        );
      }

      // Check if rubric is used in any SprintEvaluation
      const evaluationExists = await this.evaluationModel.exists({
        rubricId,
      });
      if (evaluationExists) {
        this.logger.warn(
          JSON.stringify({
            event: 'rubric.delete_conflict',
            rubricId,
            reason: 'Rubric is referenced in one or more sprint evaluations',
            correlationId: correlationId ?? null,
          }),
        );
        throw new ConflictException(
          `Rubric with ID '${rubricId}' is used in evaluations and cannot be deleted.`,
        );
      }

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
