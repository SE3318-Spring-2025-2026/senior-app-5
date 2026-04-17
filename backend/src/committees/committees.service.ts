import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Committee, CommitteeDocument } from './schemas/committee.schema';
import { JuryMemberPageDto } from './dto/jury-member-page.dto';
import { CommitteeAdvisorResponse } from './dto/committee-advisor-response.dto';
import { UsersService } from '../users/users.service';
import { Role } from '../auth/enums/role.enum';

@Injectable()
export class CommitteesService {
  private readonly logger = new Logger(CommitteesService.name);

  constructor(
    @InjectModel(Committee.name)
    private readonly committeeModel: Model<CommitteeDocument>,
    private readonly usersService: UsersService,
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

  async addAdvisor(
    committeeId: string,
    advisorUserId: string,
    assignedAt: Date | undefined,
    coordinatorId: string,
    correlationId?: string,
  ): Promise<CommitteeAdvisorResponse> {
    try {
      // Verify committee exists
      const committee = await this.committeeModel
        .findOne({ committeeId })
        .exec();
      if (!committee) {
        throw new NotFoundException(`Committee ${committeeId} not found`);
      }

      // Check if advisor is already linked
      if (committee.advisorId === advisorUserId) {
        throw new ConflictException(
          `Advisor ${advisorUserId} is already linked to committee ${committeeId}`,
        );
      }

      // Verify advisor exists and has ADVISOR (Professor) role
      const advisor = await this.usersService.findByIdAndRole(
        advisorUserId,
        Role.Professor,
      );
      if (!advisor) {
        throw new NotFoundException(
          `Advisor ${advisorUserId} not found or does not have advisor role`,
        );
      }

      // Set default assignedAt to current time if not provided
      const finalAssignedAt = assignedAt || new Date();

      // Update committee with advisor information
      const updatedCommittee = await this.committeeModel
        .findOneAndUpdate(
          { committeeId },
          {
            advisorId: advisorUserId,
            advisorAssignedAt: finalAssignedAt,
            advisorAssignedBy: coordinatorId,
          },
          { new: true },
        )
        .exec();

      if (!updatedCommittee) {
        throw new NotFoundException(`Committee ${committeeId} not found`);
      }

      this.logger.log({
        event: 'committee_advisor_linked',
        committeeId,
        advisorUserId,
        coordinatorId,
        assignedAt: finalAssignedAt,
        correlationId: correlationId ?? null,
      });

      return {
        advisorUserId,
        assignedAt: finalAssignedAt,
        assignedByUserId: coordinatorId,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      this.logger.error({
        event: 'committee_advisor_link_failed',
        committeeId,
        advisorUserId,
        coordinatorId,
        correlationId: correlationId ?? null,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error,
      });

      throw new InternalServerErrorException(
        'An unexpected error occurred while linking advisor to committee',
      );
    }
  }
}