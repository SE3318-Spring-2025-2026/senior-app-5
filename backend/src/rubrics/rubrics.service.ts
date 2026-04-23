import {
  Injectable,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Rubric, RubricDocument } from './schemas/rubric.schema';
import { DeliverablesService } from '../deliverables/deliverables.service';
import { CreateRubricDto } from './dto/create-rubric.dto';

@Injectable()
export class RubricsService {
  private readonly logger = new Logger(RubricsService.name);

  constructor(
    @InjectModel(Rubric.name)
    private readonly rubricModel: Model<RubricDocument>,
    private readonly deliverablesService: DeliverablesService,
  ) {}

  /**
   * Validates that the sum of all criteria weights equals 1.0
   */
  private validateCriteriaWeights(questions: any[]): void {
    const sum = questions.reduce((acc, q) => acc + q.criteriaWeight, 0);
    const roundedSum = Math.round(sum * 1000000) / 1000000; // Account for floating point precision

    if (Math.abs(roundedSum - 1.0) > 0.00001) {
      throw new BadRequestException(
        `Criteria weights must sum to exactly 1.0. Current sum: ${roundedSum}`,
      );
    }
  }

  /**
   * Creates a new rubric for a deliverable.
   * Atomically deactivates any previously active rubric using a transaction.
   */
  async createRubric(
    deliverableId: string,
    createRubricDto: CreateRubricDto,
    correlationId?: string,
  ): Promise<Rubric> {
    try {
      // Validate deliverable exists
      await this.deliverablesService.findById(deliverableId, correlationId);

      // Validate criteria weights sum to 1.0
      this.validateCriteriaWeights(createRubricDto.questions);

      // Start a session for transaction
      const session = await this.rubricModel.startSession();
      session.startTransaction();

      try {
        // Find and deactivate the current active rubric for this deliverable
        await this.rubricModel.updateMany(
          { deliverableId, isActive: true },
          { $set: { isActive: false } },
          { session },
        );

        // Create new rubric with isActive = true
        const newRubric = new this.rubricModel({
          deliverableId,
          name: createRubricDto.name,
          isActive: true,
          questions: createRubricDto.questions.map((q) => ({
            criteriaName: q.criteriaName,
            criteriaWeight: q.criteriaWeight,
          })),
        });

        const savedRubric = await newRubric.save({ session });

        // Commit transaction
        await session.commitTransaction();

        this.logger.log({
          event: 'rubric_created',
          rubricId: savedRubric.rubricId,
          deliverableId,
          isActive: true,
          correlationId: correlationId ?? null,
        });

        return savedRubric.toObject() as Rubric;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        await session.endSession();
      }
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error({
        event: 'rubric_create_failed',
        deliverableId,
        correlationId: correlationId ?? null,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error,
      });

      throw new InternalServerErrorException(
        'An unexpected error occurred while creating rubric',
      );
    }
  }

  /**
   * Lists all rubrics for a deliverable, optionally filtered to only active ones.
   */
  async listRubrics(
    deliverableId: string,
    activeOnly: boolean = false,
    correlationId?: string,
  ): Promise<Rubric[]> {
    try {
      // Validate deliverable exists
      await this.deliverablesService.findById(deliverableId, correlationId);

      const query: any = { deliverableId };
      if (activeOnly) {
        query.isActive = true;
      }

      const rubrics = await this.rubricModel
        .find(query)
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      this.logger.log({
        event: 'rubrics_listed',
        deliverableId,
        activeOnly,
        count: rubrics.length,
        correlationId: correlationId ?? null,
      });

      return rubrics as Rubric[];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error({
        event: 'rubrics_list_failed',
        deliverableId,
        activeOnly,
        correlationId: correlationId ?? null,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error,
      });

      throw new InternalServerErrorException(
        'An unexpected error occurred while listing rubrics',
      );
    }
  }

  /**
   * Deletes a rubric if it is not referenced in any SprintEvaluation.
   * TODO: Implement SprintEvaluation reference check once SprintEvaluation module is available.
   * For now, deletion is allowed (reference check returns false).
   */
  async deleteRubric(
    deliverableId: string,
    rubricId: string,
    correlationId?: string,
  ): Promise<void> {
    try {
      // Validate deliverable exists
      await this.deliverablesService.findById(deliverableId, correlationId);

      // Find rubric and verify it belongs to this deliverable
      const rubric = await this.rubricModel
        .findOne({ rubricId, deliverableId })
        .exec();

      if (!rubric) {
        throw new NotFoundException(
          `Rubric ${rubricId} not found for deliverable ${deliverableId}`,
        );
      }

      // TODO: Check if rubric is used in SprintEvaluation
      // const isRubricUsed = await this.checkRubricUsedInEvaluation(rubricId);
      // if (isRubricUsed) {
      //   throw new ConflictException(
      //     'Rubric is currently referenced in evaluations and cannot be deleted',
      //   );
      // }

      // Delete the rubric
      await this.rubricModel.deleteOne({ rubricId }).exec();

      this.logger.log({
        event: 'rubric_deleted',
        rubricId,
        deliverableId,
        correlationId: correlationId ?? null,
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      this.logger.error({
        event: 'rubric_delete_failed',
        rubricId,
        deliverableId,
        correlationId: correlationId ?? null,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error,
      });

      throw new InternalServerErrorException(
        'An unexpected error occurred while deleting rubric',
      );
    }
  }

  /**
   * TODO: Implement when SprintEvaluation module is available
   * Check if a rubric is referenced in any SprintEvaluation
   */
  // private async checkRubricUsedInEvaluation(rubricId: string): Promise<boolean> {
  //   // To be implemented
  //   return false;
  // }
}
