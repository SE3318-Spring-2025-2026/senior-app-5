import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Committee, CommitteeDocument } from './schemas/committee.schema';
import { JuryMemberPageDto } from './dto/jury-member-page.dto';

@Injectable()
export class CommitteesService {
  private readonly logger = new Logger(CommitteesService.name);

  constructor(
    @InjectModel(Committee.name)
    private readonly committeeModel: Model<CommitteeDocument>,
  ) {}

  async listJuryMembers(
    committeeId: string,
    page: number,
    limit: number,
    callerRole: string,
    correlationId?: string,
  ): Promise<JuryMemberPageDto> {
    try {
      const committee = await this.committeeModel
        .findOne({ committeeId })
        .lean()
        .exec();

      if (!committee) {
        throw new NotFoundException('Committee not found');
      }

      const allMembers = (committee.juryMembers ?? []).map((member) => ({
        userId: member.userId,
        assignedAt: member.assignedAt,
      }));

      const total = allMembers.length;
      const startIndex = (page - 1) * limit;
      const data = allMembers.slice(startIndex, startIndex + limit);

      this.logger.log({
        event: 'jury_members_listed',
        committeeId,
        callerRole,
        page,
        limit,
        resultCount: data.length,
        correlationId: correlationId ?? null,
      });

      return {
        data,
        total,
        page,
        limit,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error({
        event: 'jury_members_list_failed',
        committeeId,
        page,
        limit,
        correlationId: correlationId ?? null,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error,
      });

      throw new InternalServerErrorException(
        'An unexpected error occurred while listing jury members',
      );
    }
  }
}