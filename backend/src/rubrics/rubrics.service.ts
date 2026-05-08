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
import { CreateRubricDto } from './dto/create-rubric.dto';
import { ListRubricsQueryDto } from './dto/rubric-response.dto';
import {
  RubricResponseDto,
  PaginatedRubricsDto,
} from './dto/rubric-response.dto';
import { Rubric, RubricDocument } from './schemas/rubric.schema';
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
    @InjectModel(SprintEvaluation.name)
    private readonly sprintEvaluationModel: Model<SprintEvaluationDocument>,
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
   * Deactivates the previous active rubric, then creates the new one.
   * Validates that question weights sum to exactly 1.0.
   */
  async createRubric(
    dto: CreateRubricDto,
    actorId: string,
    correlationId?: string,
  ): Promise<RubricResponseDto> {
    try {
      const weightSum = dto.questions.reduce(
        (sum, q) => sum + q.criteriaWeight,
        0,
      );
      if (Math.abs(weightSum - 1.0) > 0.0001) {
        throw new BadRequestException(
          `Question criteria weights must sum to exactly 1.0. Current sum: ${weightSum.toFixed(4)}.`,
        );
      }

      await this.rubricModel
        .updateMany(
          { deliverableId: dto.deliverableId, isActive: true },
          { $set: { isActive: false } },
        )
        .exec();

      const rubric = await this.rubricModel.create({
        deliverableId: dto.deliverableId,
        name: dto.name.trim(),
        gradingType: dto.gradingType,
        isActive: true,
        questions: dto.questions,
      });

      this.logger.log(
        JSON.stringify({
          event: 'rubric.created',
          rubricId: rubric.rubricId,
          deliverableId: dto.deliverableId,
          actorId,
          correlationId: correlationId ?? null,
        }),
      );

      return this.toResponseDto((rubric as RubricDocument).toObject());
    } catch (error) {
      throw this.toWriteException(error, correlationId);
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
   * Return the active rubric for a deliverable as a response DTO, or throw 404.
   */
  async findActiveRubricDto(
    deliverableId: string,
    correlationId?: string,
  ): Promise<RubricResponseDto> {
    const rubric = await this.getActiveRubric(deliverableId, correlationId);
    if (!rubric) {
      throw new NotFoundException(
        `No active rubric found for deliverable '${deliverableId}'.`,
      );
    }
    return this.toResponseDto(rubric.toObject());
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

      const inUse = await this.sprintEvaluationModel
        .exists({ rubricId })
        .exec();
      if (inUse) {
        throw new ConflictException(
          'Rubric is in use by sprint evaluations and cannot be deleted.',
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
      gradingType: rubric.gradingType,
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
