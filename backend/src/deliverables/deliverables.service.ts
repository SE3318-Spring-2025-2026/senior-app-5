import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Deliverable, DeliverableDocument } from './deliverable.entity';

@Injectable()
export class DeliverablesService {
  private readonly logger = new Logger(DeliverablesService.name);

  constructor(
    @InjectModel(Deliverable.name)
    private readonly deliverableModel: Model<DeliverableDocument>,
  ) {}

  async findById(
    deliverableId: string,
    correlationId?: string,
  ): Promise<Deliverable> {
    try {
      const deliverable = await this.deliverableModel
        .findOne({ deliverableId })
        .lean()
        .exec();

      if (!deliverable) {
        throw new NotFoundException(`Deliverable ${deliverableId} not found`);
      }

      this.logger.log({
        event: 'deliverable_fetched',
        deliverableId,
        correlationId: correlationId ?? null,
      });

      return deliverable as Deliverable;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error({
        event: 'deliverable_fetch_failed',
        deliverableId,
        correlationId: correlationId ?? null,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error,
      });

      throw new InternalServerErrorException(
        'An unexpected error occurred while fetching deliverable',
      );
    }
  }
}
