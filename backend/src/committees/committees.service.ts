import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Committee, CommitteeDocument } from './schemas/committee.schema';
import { CreateCommitteeDto } from './dto/create-committee.dto';
import { Group, GroupDocument } from '../groups/group.entity';

@Injectable()
export class CommitteesService {
  private readonly logger = new Logger(CommitteesService.name);

  constructor(
    @InjectModel(Committee.name)
    private readonly committeeModel: Model<CommitteeDocument>,
    @InjectModel(Group.name)
    private readonly groupModel: Model<GroupDocument>,
  ) {}

  async createCommittee(
    dto: CreateCommitteeDto,
    coordinatorId: string,
    correlationId?: string,
  ): Promise<CommitteeDocument> {
    try {
      const committee = await this.committeeModel.create({
        name: dto.name,
        jury: [],
        advisors: [],
        groups: [],
      });

      this.logger.log({
        event: 'committee_created',
        committeeId: committee.id,
        name: committee.name,
        coordinatorId,
        correlationId,
      });

      return committee;
    } catch (error) {
      this.logger.error({
        event: 'committee_create_failed',
        coordinatorId,
        correlationId,
        error: (error as Error).message,
      });
      throw new InternalServerErrorException(
        'Failed to create committee due to an unexpected error.',
      );
    }
  }

  async getCommitteeById(
    committeeId: string,
    correlationId?: string,
  ): Promise<CommitteeDocument> {
    try {
      const committee = await this.committeeModel.findOne({ id: committeeId }).exec();
      if (!committee) {
        throw new NotFoundException(`Committee with ID '${committeeId}' not found.`);
      }

      this.logger.log({
        event: 'committee_read',
        committeeId,
        correlationId,
      });

      return committee;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error({
        event: 'committee_read_failed',
        committeeId,
        correlationId,
        error: (error as Error).message,
      });
      throw new InternalServerErrorException(
        'Failed to retrieve committee due to an unexpected error.',
      );
    }
  }

  async getCommitteeByGroupId(
    groupId: string,
    correlationId?: string,
  ): Promise<CommitteeDocument> {
    try {
      const group = await this.groupModel.findOne({ groupId }).exec();
      if (!group) {
        throw new NotFoundException(`Group with ID '${groupId}' not found.`);
      }

      const committee = await this.committeeModel
        .findOne({ 'groups.groupId': groupId })
        .exec();

      if (!committee) {
        throw new NotFoundException(
          `No committee is assigned to group '${groupId}'.`,
        );
      }

      this.logger.log({
        event: 'committee_read_by_group',
        groupId,
        committeeId: committee.id,
        correlationId,
      });

      return committee;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error({
        event: 'committee_read_by_group_failed',
        groupId,
        correlationId,
        error: (error as Error).message,
      });
      throw new InternalServerErrorException(
        'Failed to retrieve committee due to an unexpected error.',
      );
    }
  }
}
