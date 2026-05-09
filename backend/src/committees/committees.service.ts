import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { UpdateCommitteeDto } from './dto/update-committee.dto';
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
import { Submission, SubmissionDocument } from '../submissions/schemas/submission.schema';
import { AddJuryMemberDto } from './dto/add-jury-member.dto';
import { JuryMemberResponseDto } from './dto/jury-member-response.dto';
import { User, UserDocument } from '../users/data/user.schema';
import { JuryMemberPageDto } from './dto/jury-member-page.dto';
import { AddCommitteeAdvisorDto } from './dto/add-committee-advisor.dto';
import { AddCommitteeAdvisorResponseDto } from './dto/add-committee-advisor-response.dto';
import {
  AdvisorGradingScopeItemDto,
  AdvisorGradingScopePageDto,
} from './dto/advisor-grading-scope-page.dto';

@Injectable()
export class CommitteesService {
  private readonly logger = new Logger(CommitteesService.name);
  private static readonly ACTIVE_GRADING_STATUSES = [
    'GRADING',
    'IN_REVIEW',
    'UNDER_REVIEW',
  ];

  constructor(
    @InjectModel(Committee.name)
    private readonly committeeModel: Model<CommitteeDocument>,
    @InjectModel(Group.name)
    private readonly groupModel: Model<GroupDocument>,
    @InjectModel(Schedule.name)
    private readonly scheduleModel: Model<ScheduleDocument>,
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<SubmissionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async deleteCommittee(
    committeeId: string,
    coordinatorId: string,
    correlationId?: string,
  ): Promise<void> {
    try {
      const deleteResult = await this.committeeModel
        .deleteOne({ id: committeeId })
        .exec();

      if (deleteResult.deletedCount === 0) {
        throw new NotFoundException(
          `Committee with ID '${committeeId}' not found.`,
        );
      }

      this.logger.log({
        event: 'committee_deleted',
        committeeId,
        coordinatorId,
        correlationId,
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) throw error;
      this.logger.error({
        event: 'committee_delete_failed',
        committeeId,
        coordinatorId,
        correlationId,
        error: (error as Error).message,
      });
      throw new InternalServerErrorException(
        'Failed to delete committee due to an unexpected error.',
      );
    }
  }

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
        throw new ConflictException(`User '${dto.userId}' is already a jury member on this committee.`);
      }

      const assignedAt = dto.assignedAt ? new Date(dto.assignedAt) : new Date();

      await this.committeeModel
        .updateOne(
          { id: committeeId },
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
      const pageGroups = allGroups.slice(skip, skip + limit);

      // Join Group collection for display names.
      const groupIds = pageGroups.map((g) => g.groupId as string).filter(Boolean);
      const groupDocs = groupIds.length > 0
        ? await this.groupModel
            .find({ groupId: { $in: groupIds } })
            .select('groupId groupName')
            .lean()
            .exec()
        : [];
      const nameMap = new Map<string, string>(
        (groupDocs as any[]).map((g) => [g.groupId, g.groupName as string]),
      );

      const data: CommitteeGroupListItemDto[] = pageGroups.map((g) => ({
        groupId: g.groupId as string,
        groupName: nameMap.get(g.groupId as string) ?? null,
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
      const pageAdvisors = allAdvisors.slice(skip, skip + limit);
      const advisorUserIds = pageAdvisors
        .map((a) => a.advisorId ?? a.userId ?? a.advisorUserId)
        .filter(Boolean);
      // Some seeded entries store UUIDs that aren't valid ObjectIds — skip
      // those for the email lookup so the whole request doesn't 500.
      const objectIdAdvisorIds = advisorUserIds.filter((id) =>
        Types.ObjectId.isValid(id),
      );
      const advisorUsers = objectIdAdvisorIds.length
        ? await this.userModel
            .find({ _id: { $in: objectIdAdvisorIds } }, { _id: 1, email: 1 })
            .lean()
            .exec()
        : [];
      const advisorEmailMap = new Map(advisorUsers.map((u) => [String(u._id), u.email as string]));
      const data: CommitteeAdvisorListItemDto[] = pageAdvisors.map((a) => {
        const uid = (a.advisorId ?? a.userId ?? a.advisorUserId) as string;
        return {
          advisorUserId: uid,
          email: advisorEmailMap.get(uid) ?? undefined,
          assignedAt: a.assignedAt as Date,
        };
      });

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

  async getEnrichedCommitteeByGroupId(
    groupId: string,
    correlationId?: string,
  ): Promise<{
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date | null;
    jury: { userId: string; email?: string }[];
    advisors: { userId: string; email?: string }[];
    groups: { groupId: string; assignedAt: Date; assignedByUserId: string }[];
  }> {
    const committee = await this.getCommitteeByGroupId(groupId, correlationId);

    const juryUserIds = (committee.jury as any[]).map((j) => j.userId);
    const advisorUserIds = (committee.advisors as any[]).map((a) => a.userId);
    const allUserIds = [...new Set([...juryUserIds, ...advisorUserIds])];

    const users = allUserIds.length
      ? await this.userModel.find(
          { _id: { $in: allUserIds.map((id) => new Types.ObjectId(id)) } },
          { _id: 1, email: 1 },
        ).lean().exec()
      : [];

    const emailMap = new Map<string, string>(
      users.map((u: any) => [u._id.toString(), u.email as string]),
    );

    return {
      id: (committee as any).id,
      name: (committee as any).name,
      createdAt: (committee as any).createdAt,
      updatedAt: (committee as any).updatedAt ?? null,
      jury: (committee.jury as any[]).map((j) => ({
        userId: j.userId,
        email: emailMap.get(j.userId) ?? j.userId,
      })),
      advisors: (committee.advisors as any[]).map((a) => ({
        userId: a.userId,
        email: emailMap.get(a.userId) ?? a.userId,
      })),
      groups: (committee.groups as any[]).map((g) => ({
        groupId: g.groupId,
        assignedAt: g.assignedAt,
        assignedByUserId: g.assignedByUserId,
      })),
    };
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

  async updateCommittee(
    committeeId: string,
    dto: UpdateCommitteeDto,
    coordinatorId: string,
    correlationId?: string,
  ): Promise<CommitteeDocument> {
    if (!dto.name) {
      throw new BadRequestException('At least one field must be provided for update.');
    }
    try {
      const committee = await this.committeeModel
        .findOneAndUpdate(
          { id: committeeId },
          { $set: { name: dto.name } },
          { new: true },
        )
        .exec();
      if (!committee) {
        throw new NotFoundException(`Committee with ID '${committeeId}' not found.`);
      }
      this.logger.log({ event: 'committee_updated', committeeId, coordinatorId, correlationId });
      return committee;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      this.logger.error({ event: 'committee_update_failed', committeeId, correlationId, error: (error as Error).message });
      throw new InternalServerErrorException('Failed to update committee due to an unexpected error.');
    }
  }

  async listJuryMembers(
    committeeId: string,
    query: ListCommitteeAdvisorsQueryDto,
    correlationId?: string,
  ): Promise<JuryMemberPageDto> {
    try {
      const committee = await this.committeeModel.findOne({ id: committeeId }).exec();
      if (!committee) {
        throw new NotFoundException(`Committee with ID '${committeeId}' not found.`);
      }

      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const skip = (page - 1) * limit;

      const allJury = (committee.jury as any[]) ?? [];
      const total = allJury.length;
      const pageJury = allJury.slice(skip, skip + limit);

      // Fetch user emails for display. Skip non-ObjectId IDs (UUIDs from seed
      // data) so a Mongoose cast error doesn't 500 the whole list.
      const userIds = pageJury.map((j) => j.userId).filter(Boolean);
      const objectIdUserIds = userIds.filter((id: string) =>
        Types.ObjectId.isValid(id),
      );
      const users = objectIdUserIds.length
        ? await this.userModel
            .find({ _id: { $in: objectIdUserIds } }, { _id: 1, email: 1 })
            .lean()
            .exec()
        : [];
      const emailMap = new Map(users.map((u) => [String(u._id), u.email as string]));

      const data: JuryMemberResponseDto[] = pageJury.map((j) => ({
        userId: j.userId as string,
        email: emailMap.get(j.userId) ?? undefined,
        assignedAt: j.assignedAt as Date,
        assignedByUserId: j.assignedByUserId as string,
      }));

      this.logger.log({ event: 'jury_members_listed', committeeId, page, limit, resultCount: data.length, correlationId });
      return { data, total, page, limit };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error({ event: 'jury_members_list_failed', committeeId, correlationId, error: (error as Error).message });
      throw new InternalServerErrorException('Failed to list jury members due to an unexpected error.');
    }
  }

  async addCommitteeAdvisor(
    committeeId: string,
    dto: AddCommitteeAdvisorDto,
    coordinatorId: string,
    correlationId?: string,
  ): Promise<AddCommitteeAdvisorResponseDto> {
    try {
      const committee = await this.committeeModel.findOne({ id: committeeId }).exec();
      if (!committee) {
        throw new NotFoundException(`Committee with ID '${committeeId}' not found.`);
      }

      type AdvisorEntry = { advisorId?: string; userId?: string; advisorUserId?: string };
      const advisors = (committee.advisors as AdvisorEntry[]) ?? [];
      const alreadyLinked = advisors.some(
        (a) => a.advisorId === dto.advisorId || a.userId === dto.advisorId || a.advisorUserId === dto.advisorId,
      );
      if (alreadyLinked) {
        throw new ConflictException(`Advisor '${dto.advisorId}' is already linked to this committee.`);
      }

      const assignedAt = new Date();
      const entry = {
        advisorId: dto.advisorId,
        assignmentSource: dto.assignmentSource,
        assignedAt,
        assignedByUserId: coordinatorId,
      };

      await this.committeeModel
        .updateOne({ id: committeeId }, { $push: { advisors: entry } })
        .exec();

      // Auto-assign all groups whose primary advisor is this advisor
      const advisorGroups = await this.groupModel
        .find({ assignedAdvisorId: dto.advisorId })
        .lean<Group[]>()
        .exec();

      if (advisorGroups.length > 0) {
        const existingGroupIds = new Set(
          ((committee.groups as any[]) ?? []).map((g) => g.groupId as string),
        );
        const newGroupEntries = advisorGroups
          .filter((g) => !existingGroupIds.has(g.groupId))
          .map((g) => ({
            groupId: g.groupId,
            assignedAt,
            assignedByUserId: coordinatorId,
          }));

        if (newGroupEntries.length > 0) {
          await this.committeeModel
            .updateOne({ id: committeeId }, { $push: { groups: { $each: newGroupEntries } } })
            .exec();
          this.logger.log({
            event: 'committee_groups_auto_assigned',
            committeeId,
            advisorId: dto.advisorId,
            groupCount: newGroupEntries.length,
            correlationId,
          });
        }
      }

      this.logger.log({ event: 'committee_advisor_added', committeeId, advisorId: dto.advisorId, coordinatorId, correlationId });
      return { advisorId: dto.advisorId, assignmentSource: dto.assignmentSource, assignedAt, assignedByUserId: coordinatorId };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) throw error;
      this.logger.error({ event: 'committee_advisor_add_failed', committeeId, advisorId: dto.advisorId, correlationId, error: (error as Error).message });
      throw new InternalServerErrorException('Failed to add committee advisor due to an unexpected error.');
    }
  }

  async getAdvisorGradingScope(
    committeeId: string,
    advisorUserId: string,
    query: ListCommitteeAdvisorsQueryDto,
    correlationId?: string,
  ): Promise<AdvisorGradingScopePageDto> {
    try {
      const committee = await this.committeeModel.findOne({ id: committeeId }).exec();
      if (!committee) {
        throw new NotFoundException(`Committee with ID '${committeeId}' not found.`);
      }

      type AdvisorEntry = { advisorId?: string; userId?: string; advisorUserId?: string };
      type JuryEntry = { userId?: string };
      const advisorLinked = ((committee.advisors as AdvisorEntry[]) ?? []).some(
        (a) => a.advisorId === advisorUserId || a.userId === advisorUserId || a.advisorUserId === advisorUserId,
      );
      const juryLinked = ((committee.jury as JuryEntry[]) ?? []).some(
        (j) => j.userId === advisorUserId,
      );
      if (!advisorLinked && !juryLinked) {
        throw new NotFoundException(`User '${advisorUserId}' is not a member of committee '${committeeId}' (neither advisor nor jury).`);
      }

      const committeeGroups = (committee.groups as any[]) ?? [];
      const groupIds = committeeGroups.map((g) => g.groupId as string);

      const groupDocs = groupIds.length > 0
        ? await this.groupModel.find({ groupId: { $in: groupIds } }).lean<Group[]>().exec()
        : [];

      const advisorMap = new Map<string, string | null>(
        groupDocs.map((g) => [g.groupId, g.assignedAdvisorId ?? null]),
      );
      const groupNameMap = new Map<string, string | null>(
        groupDocs.map((g) => [g.groupId, (g as any).groupName ?? null]),
      );

      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const skip = (page - 1) * limit;
      const total = committeeGroups.length;

      const data: AdvisorGradingScopeItemDto[] = committeeGroups
        .slice(skip, skip + limit)
        .map((g) => {
          const primaryAdvisor = advisorMap.get(g.groupId as string) ?? null;
          const isOwnGroup = primaryAdvisor === advisorUserId;
          return {
            groupId: g.groupId as string,
            groupName: groupNameMap.get(g.groupId as string) ?? null,
            assignedAt: g.assignedAt as Date,
            isOwnGroup,
            originalAdvisorUserId: isOwnGroup ? null : primaryAdvisor,
          };
        });

      this.logger.log({ event: 'advisor_grading_scope_listed', committeeId, advisorUserId, page, limit, resultCount: data.length, correlationId });
      return { data, total, page, limit };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error({ event: 'advisor_grading_scope_failed', committeeId, advisorUserId, correlationId, error: (error as Error).message });
      throw new InternalServerErrorException('Failed to retrieve advisor grading scope due to an unexpected error.');
    }
  }

  /**
   * Returns every group the caller may grade deliverables for, derived from
   * committee membership (advisor or jury). Sprint evaluations remain
   * advisor-only and are checked elsewhere.
   */
  async getMyGradableGroups(userId: string): Promise<{
    data: Array<{
      groupId: string;
      groupName: string | null;
      committeeId: string;
      role: 'advisor' | 'jury';
      isOwnGroup: boolean;
    }>;
  }> {
    type AdvisorEntry = { advisorId?: string; userId?: string; advisorUserId?: string };
    type JuryEntry = { userId?: string };

    // Find committees the caller belongs to as advisor or jury.
    const committees = await this.committeeModel
      .find({
        $or: [
          { 'advisors.advisorId': userId },
          { 'advisors.userId': userId },
          { 'advisors.advisorUserId': userId },
          { 'jury.userId': userId },
        ],
      })
      .lean()
      .exec();

    if (committees.length === 0) return { data: [] };

    const allGroupIds = [
      ...new Set(
        committees.flatMap((c) =>
          ((c.groups as { groupId: string }[]) ?? []).map((g) => g.groupId),
        ),
      ),
    ];

    const groupDocs = allGroupIds.length > 0
      ? await this.groupModel
          .find({ groupId: { $in: allGroupIds } })
          .select('groupId groupName assignedAdvisorId')
          .lean()
          .exec()
      : [];
    const groupMap = new Map(
      (groupDocs as any[]).map((g) => [
        g.groupId,
        { groupName: g.groupName ?? null, assignedAdvisorId: g.assignedAdvisorId ?? null },
      ]),
    );

    const data: Array<{
      groupId: string;
      groupName: string | null;
      committeeId: string;
      role: 'advisor' | 'jury';
      isOwnGroup: boolean;
    }> = [];

    // Deduplicate by (groupId, committeeId) — caller may belong to multiple
    // committees, but each (group, committee) edge is unique.
    const seen = new Set<string>();
    for (const c of committees) {
      const callerIsAdvisorInThisCommittee = ((c.advisors as AdvisorEntry[]) ?? []).some(
        (a) => a.advisorId === userId || a.userId === userId || a.advisorUserId === userId,
      );
      const callerIsJuryInThisCommittee = ((c.jury as JuryEntry[]) ?? []).some(
        (j) => j.userId === userId,
      );

      // Caller's role in this committee — advisor takes precedence over jury
      const role: 'advisor' | 'jury' = callerIsAdvisorInThisCommittee
        ? 'advisor'
        : callerIsJuryInThisCommittee
        ? 'jury'
        : 'advisor';

      for (const g of (c.groups as { groupId: string }[]) ?? []) {
        const key = `${g.groupId}::${c.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const meta = groupMap.get(g.groupId);
        data.push({
          groupId: g.groupId,
          groupName: meta?.groupName ?? null,
          committeeId: c.id as string,
          role,
          isOwnGroup: meta?.assignedAdvisorId === userId,
        });
      }
    }

    return { data };
  }

  /**
   * Throws ForbiddenException if the caller is not allowed to record a
   * deliverable evaluation for this group. Allowed when the caller belongs
   * (advisor or jury) to ANY committee that includes this group.
   */
  async assertCanGradeDeliverable(groupId: string, userId: string): Promise<void> {
    const committee = await this.committeeModel
      .findOne({
        'groups.groupId': groupId,
        $or: [
          { 'advisors.advisorId': userId },
          { 'advisors.userId': userId },
          { 'advisors.advisorUserId': userId },
          { 'jury.userId': userId },
        ],
      })
      .lean()
      .exec();
    if (!committee) {
      throw new ForbiddenException(
        `You are not on a committee for group '${groupId}', so you cannot record a deliverable evaluation.`,
      );
    }
  }
}
