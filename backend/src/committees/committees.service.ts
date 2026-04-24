import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Committee, CommitteeDocument } from './schemas/committee.schema';
import { CreateCommitteeDto } from './dto/create-committee.dto';
import { ListCommitteeGroupsQueryDto } from './dto/list-committee-groups-query.dto';
import {
  CommitteeGroupListItemDto,
  CommitteeGroupPageDto,
} from './dto/committee-group-page.dto';
import { ListCommitteeAdvisorsQueryDto } from './dto/list-committee-advisors-query.dto';
import {
  CommitteeAdvisorListItemDto,
  CommitteeAdvisorPageDto,
} from './dto/committee-advisor-page.dto';
import { Group, GroupDocument } from '../groups/group.entity';
import { ListCommitteesQueryDto } from './dto/list-committees-query.dto';
import {
  CommitteeListItemDto,
  CommitteePageDto,
} from './dto/committee-page.dto';
import {
  Schedule,
  ScheduleDocument,
  SchedulePhase,
} from '../advisors/schemas/schedule.schema';
import { AssignCommitteeGroupDto } from './dto/assign-committee-group.dto';
import { CommitteeGroupResponseDto } from './dto/committee-group-response.dto';
import { AddJuryMemberDto } from './dto/add-jury-member.dto';
import { JuryMemberResponseDto } from './dto/jury-member-response.dto';
import { User, UserDocument } from '../users/data/user.schema';

@Injectable()
export class CommitteesService {
  private readonly logger = new Logger(CommitteesService.name);

  constructor(
    @InjectModel(Committee.name)
    private readonly committeeModel: Model<CommitteeDocument>,
    @InjectModel(Group.name)
    private readonly groupModel: Model<GroupDocument>,
    @InjectModel(Schedule.name)
    private readonly scheduleModel: Model<ScheduleDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async addJuryMember(
    committeeId: string,
    dto: AddJuryMemberDto,
    coordinatorId: string,
    correlationId?: string,
  ): Promise<JuryMemberResponseDto> {
    try {
      const committee = await this.committeeModel
        .findOne({ id: committeeId })
        .exec();

      if (!committee) {
        throw new NotFoundException(
          `Committee with ID '${committeeId}' not found.`,
        );
      }

      const userFilter = Types.ObjectId.isValid(dto.userId)
        ? { _id: new Types.ObjectId(dto.userId) }
        : { id: dto.userId };
      const userExists = await this.userModel
        .exists(userFilter)
        .then((result) => result !== null);
      if (!userExists) {
        throw new NotFoundException(`User with ID '${dto.userId}' not found.`);
      }

      const juryList = (committee.jury as Array<{ userId?: string }>) ?? [];
      const alreadyAssigned = juryList.some((jury) => jury.userId === dto.userId);
      if (alreadyAssigned) {
        throw new ConflictException('User is already assigned as a jury member.');
      }

      const assignedAt = dto.assignedAt ? new Date(dto.assignedAt) : new Date();

      const updateResult = await this.committeeModel
        .updateOne(
          { id: committeeId, 'jury.userId': { $ne: dto.userId } },
          {
            $push: {
              jury: {
                userId: dto.userId,
                assignedAt,
                assignedByUserId: coordinatorId,
              },
            },
          },
        )
        .exec();

      if (updateResult.modifiedCount === 0) {
        throw new ConflictException('User is already assigned as a jury member.');
      }

      this.logger.log({
        event: 'jury_member_added',
        committeeId,
        addedUserId: dto.userId,
        coordinatorId,
        correlationId,
      });

      return {
        userId: dto.userId,
        assignedAt,
        assignedByUserId: coordinatorId,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }

      this.logger.error({
        event: 'jury_member_add_failed',
        committeeId,
        userId: dto.userId,
        coordinatorId,
        correlationId,
        error: (error as Error).message,
      });
      throw new InternalServerErrorException(
        'Failed to add jury member due to an unexpected error.',
      );
    }
  }

  async listCommittees(
    query: ListCommitteesQueryDto,
    callerRole: string,
    correlationId?: string,
  ): Promise<CommitteePageDto> {
    try {
      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const skip = (page - 1) * limit;

      const filter: Record<string, unknown> = {};
      if (query.name) {
        filter['name'] = { $regex: query.name, $options: 'i' };
      }

      const [committees, total] = await Promise.all([
        this.committeeModel
          .find(filter, { jury: 0, advisors: 0, groups: 0 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.committeeModel.countDocuments(filter).exec(),
      ]);

      const data: CommitteeListItemDto[] = committees.map((c) => ({
        id: c.id as string,
        name: c.name,
        createdAt: (c as any).createdAt as Date,
        updatedAt: ((c as any).updatedAt as Date | null) ?? null,
      }));

      this.logger.log({
        event: 'committees_listed',
        callerRole,
        page,
        limit,
        nameFilter: query.name ?? null,
        resultCount: data.length,
        correlationId,
      });

      return { data, total, page, limit };
    } catch (error) {
      this.logger.error({
        event: 'committees_list_failed',
        correlationId,
        error: (error as Error).message,
      });
      throw new InternalServerErrorException(
        'Failed to retrieve committees due to an unexpected error.',
      );
    }
  }

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
      const committee = await this.committeeModel
        .findOne({ id: committeeId })
        .exec();
      if (!committee) {
        throw new NotFoundException(
          `Committee with ID '${committeeId}' not found.`,
        );
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

  async listCommitteeGroups(
    committeeId: string,
    query: ListCommitteeGroupsQueryDto,
    correlationId?: string,
  ): Promise<CommitteeGroupPageDto> {
    try {
      const committee = await this.committeeModel
        .findOne({ id: committeeId })
        .exec();
      if (!committee) {
        throw new NotFoundException(
          `Committee with ID '${committeeId}' not found.`,
        );
      }

      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const skip = (page - 1) * limit;

      const allGroups = (committee.groups as any[]) ?? [];
      const total = allGroups.length;
      const data: CommitteeGroupListItemDto[] = allGroups
        .slice(skip, skip + limit)
        .map((g) => ({
          groupId: g.groupId as string,
          assignedAt: g.assignedAt as Date,
          assignedByUserId: g.assignedByUserId as string,
        }));

      this.logger.log({
        event: 'committee_groups_listed',
        committeeId,
        page,
        limit,
        resultCount: data.length,
        correlationId,
      });

      return { data, total, page, limit };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error({
        event: 'committee_groups_list_failed',
        committeeId,
        correlationId,
        error: (error as Error).message,
      });
      throw new InternalServerErrorException(
        'Failed to retrieve committee groups due to an unexpected error.',
      );
    }
  }

  async listCommitteeAdvisors(
    committeeId: string,
    query: ListCommitteeAdvisorsQueryDto,
    correlationId?: string,
  ): Promise<CommitteeAdvisorPageDto> {
    try {
      const committee = await this.committeeModel
        .findOne({ id: committeeId })
        .exec();
      if (!committee) {
        throw new NotFoundException(
          `Committee with ID '${committeeId}' not found.`,
        );
      }

      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const skip = (page - 1) * limit;

      const allAdvisors = (committee.advisors as any[]) ?? [];
      const total = allAdvisors.length;
      const data: CommitteeAdvisorListItemDto[] = allAdvisors
        .slice(skip, skip + limit)
        .map((a) => ({
          advisorUserId: (a.advisorId ?? a.userId ?? a.advisorUserId) as string,
          assignedAt: a.assignedAt as Date,
        }));

      this.logger.log({
        event: 'committee_advisors_listed',
        committeeId,
        page,
        limit,
        resultCount: data.length,
        correlationId,
      });

      return { data, total, page, limit };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error({
        event: 'committee_advisors_list_failed',
        committeeId,
        correlationId,
        error: (error as Error).message,
      });
      throw new InternalServerErrorException(
        'Failed to retrieve committee advisors due to an unexpected error.',
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

  async removeJuryMember(
    committeeId: string,
    userId: string,
    coordinatorId: string,
    correlationId?: string,
  ): Promise<void> {
    try {
      const committee = await this.committeeModel
        .findOne({ id: committeeId })
        .exec();

      if (!committee) {
        throw new NotFoundException(
          `Committee with ID '${committeeId}' not found.`,
        );
      }

      const memberExists = (committee.jury as Array<{ userId: string }>).some(
        (j) => j.userId === userId,
      );

      if (!memberExists) {
        throw new NotFoundException(
          `Jury member with user ID '${userId}' not found in committee '${committeeId}'.`,
        );
      }

      await this.committeeModel
        .findOneAndUpdate({ id: committeeId }, { $pull: { jury: { userId } } })
        .exec();

      this.logger.log({
        event: 'jury_member_removed',
        committeeId,
        removedUserId: userId,
        coordinatorId,
        correlationId,
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error({
        event: 'jury_member_remove_failed',
        committeeId,
        userId,
        coordinatorId,
        correlationId,
        error: (error as Error).message,
      });
      throw new InternalServerErrorException(
        'Failed to remove jury member due to an unexpected error.',
      );
    }
  }

  async assignGroupToCommittee(
    committeeId: string,
    dto: AssignCommitteeGroupDto,
    coordinatorId: string,
    correlationId?: string,
  ): Promise<CommitteeGroupResponseDto> {
    const startedAt = Date.now();
    try {
      const schedule = await this.scheduleModel
        .findOne({ phase: SchedulePhase.COMMITTEE_ASSIGNMENT, isActive: true })
        .sort({ createdAt: -1 })
        .lean<{ startDatetime: Date; endDatetime: Date } | null>()
        .exec();

      const scheduleLatencyMs = Date.now() - startedAt;
      const now = Date.now();
      const scheduleOpen =
        schedule !== null &&
        now >= new Date(schedule.startDatetime).getTime() &&
        now <= new Date(schedule.endDatetime).getTime();

      this.logger.log({
        event: 'committee_assignment_schedule_check',
        phase: SchedulePhase.COMMITTEE_ASSIGNMENT,
        isOpen: scheduleOpen,
        latencyMs: scheduleLatencyMs,
        committeeId,
        groupId: dto.groupId,
        coordinatorId,
        correlationId,
      });

      if (!scheduleOpen) {
        throw new HttpException(
          'Committee assignment schedule window is closed.',
          423,
        );
      }

      const committee = await this.committeeModel.findOne({ id: committeeId }).exec();
      if (!committee) {
        throw new NotFoundException(`Committee with ID '${committeeId}' not found.`);
      }

      const group = await this.groupModel.findOne({ groupId: dto.groupId }).lean<Group>().exec();
      if (!group) {
        throw new NotFoundException(`Group with ID '${dto.groupId}' not found.`);
      }

      if (!group.assignedAdvisorId) {
        throw new UnprocessableEntityException(
          'Group does not have a confirmed advisor assignment.',
        );
      }

      const existingCommitteeForGroup = await this.committeeModel
        .findOne({ 'groups.groupId': dto.groupId })
        .lean<{ id: string } | null>()
        .exec();
      if (existingCommitteeForGroup) {
        throw new ConflictException('Group is already assigned to a committee.');
      }

      const assignedAt = dto.assignedAt ? new Date(dto.assignedAt) : new Date();
      const advisorAlreadyLinked = ((committee.advisors as any[]) ?? []).some(
        (advisor) =>
          advisor.advisorId === group.assignedAdvisorId ||
          advisor.userId === group.assignedAdvisorId ||
          advisor.advisorUserId === group.assignedAdvisorId,
      );

      const groupsToPersist = [
        ...((committee.groups as any[]) ?? []),
        {
          groupId: dto.groupId,
          assignedAt,
          assignedByUserId: coordinatorId,
        },
      ];
      const advisorsToPersist = advisorAlreadyLinked
        ? ((committee.advisors as any[]) ?? [])
        : [
            ...((committee.advisors as any[]) ?? []),
            {
              advisorId: group.assignedAdvisorId,
              assignedAt,
              assignedByUserId: coordinatorId,
              assignmentSource: 'PRIMARY_ADVISOR',
            },
          ];

      const updateResult = await this.committeeModel
        .updateOne(
          { id: committeeId, 'groups.groupId': { $ne: dto.groupId } },
          { $set: { groups: groupsToPersist, advisors: advisorsToPersist } },
        )
        .exec();

      if (updateResult.modifiedCount === 0) {
        throw new ConflictException('Group is already assigned to a committee.');
      }

      this.logger.log({
        event: 'group_assigned_to_committee',
        committeeId,
        groupId: dto.groupId,
        advisorAutoLinked: !advisorAlreadyLinked,
        coordinatorId,
        correlationId,
      });

      return {
        groupId: dto.groupId,
        assignedAt,
        assignedByUserId: coordinatorId,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof UnprocessableEntityException ||
        (error instanceof HttpException && error.getStatus() === 423)
      ) {
        throw error;
      }
      this.logger.error({
        event: 'group_assign_to_committee_failed',
        committeeId,
        groupId: dto.groupId,
        coordinatorId,
        correlationId,
        error: (error as Error).message,
      });
      throw new InternalServerErrorException(
        'Failed to assign group to committee due to an unexpected error.',
      );
    }
  }

  async removeCommitteeAdvisor(
    committeeId: string,
    advisorUserId: string,
    coordinatorId: string,
    correlationId?: string,
  ): Promise<void> {
    try {
      const committee = await this.committeeModel
        .findOne({ id: committeeId })
        .exec();
      if (!committee) {
        throw new NotFoundException(
          `Committee with ID '${committeeId}' not found.`,
        );
      }

      type AdvisorEntry = {
        advisorId?: string;
        userId?: string;
        advisorUserId?: string;
        [key: string]: unknown;
      };
      const advisors = (committee.advisors as AdvisorEntry[]) ?? [];
      const advisorIndex = advisors.findIndex(
        (a) =>
          a.advisorId === advisorUserId ||
          a.userId === advisorUserId ||
          a.advisorUserId === advisorUserId,
      );

      if (advisorIndex === -1) {
        throw new NotFoundException(
          `Advisor link for user '${advisorUserId}' not found in committee '${committeeId}'.`,
        );
      }

      const updatedAdvisors: unknown[] = [
        ...advisors.slice(0, advisorIndex),
        ...advisors.slice(advisorIndex + 1),
      ];

      await this.committeeModel
        .updateOne({ id: committeeId }, { $set: { advisors: updatedAdvisors } })
        .exec();

      this.logger.log({
        event: 'committee_advisor_unlinked',
        committeeId,
        advisorUserId,
        coordinatorId,
        correlationId,
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error({
        event: 'committee_advisor_unlink_failed',
        committeeId,
        advisorUserId,
        coordinatorId,
        correlationId,
        error: (error as Error).message,
      });
      throw new InternalServerErrorException(
        'Failed to remove committee advisor due to an unexpected error.',
      );
    }
  }

  async removeGroupFromCommittee(
    committeeId: string,
    groupId: string,
    coordinatorId: string,
    correlationId?: string,
  ): Promise<void> {
    try {
      const committee = await this.committeeModel
        .findOne({ id: committeeId })
        .exec();
      if (!committee) {
        throw new NotFoundException(
          `Committee with ID '${committeeId}' not found.`,
        );
      }

      const groupExistsInCommittee = ((committee.groups as any[]) ?? []).some(
        (group) => group.groupId === groupId,
      );
      if (!groupExistsInCommittee) {
        throw new NotFoundException(
          `Group '${groupId}' is not assigned to committee '${committeeId}'.`,
        );
      }

      await this.committeeModel
        .updateOne({ id: committeeId }, { $pull: { groups: { groupId } } })
        .exec();

      this.logger.log({
        event: 'committee_group_removed',
        committeeId,
        groupId,
        coordinatorId,
        correlationId,
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error({
        event: 'committee_group_remove_failed',
        committeeId,
        groupId,
        coordinatorId,
        correlationId,
        error: (error as Error).message,
      });
      throw new InternalServerErrorException(
        'Failed to remove group from committee due to an unexpected error.',
      );
    }
  }
}
