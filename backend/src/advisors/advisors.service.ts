import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../auth/enums/role.enum';
import {
  Group,
  GroupAssignmentStatus,
  GroupDocument,
  GroupStatus,
} from '../groups/group.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { User, UserDocument } from '../users/data/user.schema';
import { AdvisorDecision } from './dto/decision-request.dto';
import { ListAdvisorsQueryDto } from './dto/list-advisors-query.dto';
import {
  AdvisorRequest,
  AdvisorRequestDocument,
  AdvisorRequestStatus,
} from './schemas/advisor-request.schema';
import {
  Schedule,
  ScheduleDocument,
  SchedulePhase,
} from './schemas/schedule.schema';

export interface AdvisorListItem {
  advisorId: string;
  name: string;
  email: string;
  role: string;
}

export interface PaginatedAdvisorsResponse {
  data: AdvisorListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface SetScheduleInput {
  phase: SchedulePhase;
  startDatetime: string;
  endDatetime: string;
  coordinatorId: string;
}

export interface ScheduleResponse {
  scheduleId: string;
  coordinatorId: string;
  phase: SchedulePhase;
  startDatetime: string;
  endDatetime: string;
  createdAt: string;
}

export interface ActiveScheduleResponse extends ScheduleResponse {
  isOpen: boolean;
}

interface AdvisorRecord {
  _id?: { toString(): string } | string;
  id?: string;
  name?: string;
  email: string;
  role: string;
}

interface ScheduleRecord {
  scheduleId?: string;
  coordinatorId: string;
  phase: SchedulePhase;
  startDatetime: Date;
  endDatetime: Date;
  createdAt?: Date;
}

function getAdvisorRoleFilters(): Role[] {
  return [Role.Professor];
}

export interface SubmitRequestInput {
  requestedAdvisorId: string;
  submittedBy: string;
}

export interface DecideRequestInput {
  requestId: string;
  advisorId: string;
  decision: AdvisorDecision;
}

export interface WithdrawRequestInput {
  requestId: string;
  teamLeaderId: string;
}

export interface ReleaseTeamInput {
  advisorId: string;
  groupId: string;
  callerId: string;
  callerRole: string;
}

export interface ListRequestsInput {
  callerId: string;
  callerRole: string;
  requestedAdvisorId?: string;
  status?: AdvisorRequestStatus;
  page: number;
  limit: number;
}

export interface PaginatedRequestsResponse {
  data: AdvisorRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface TransferAdvisorInput {
  groupId: string;
  currentAdvisorId: string;
  newAdvisorId: string;
}

export interface GroupAssignmentStatusResponse {
  groupId: string;
  status: GroupAssignmentStatus | 'DISBANDED';
  advisorId: string | null;
  advisorName: string | null;
  canSubmitRequest: boolean;
  blockedReason: string | null;
  updatedAt: string;
}

@Injectable()
export class AdvisorsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>,
    @InjectModel(AdvisorRequest.name)
    private readonly advisorRequestModel: Model<AdvisorRequestDocument>,
    @InjectModel(Schedule.name)
    private readonly scheduleModel: Model<ScheduleDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listAdvisors(
    query: ListAdvisorsQueryDto,
  ): Promise<PaginatedAdvisorsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const advisorRoleFilters = getAdvisorRoleFilters();
    const roleFilter = { role: { $in: advisorRoleFilters } };
    const skip = (page - 1) * limit;

    try {
      const total = await this.userModel.countDocuments(roleFilter).exec();
      const advisors = await this.userModel
        .find(roleFilter)
        .skip(skip)
        .limit(limit)
        .lean<AdvisorRecord[]>()
        .exec();

      const data = advisors.map((advisor) => ({
        advisorId:
          typeof advisor._id === 'string'
            ? advisor._id
            : (advisor._id?.toString() ?? advisor.id ?? ''),
        name: advisor.name ?? advisor.email,
        email: advisor.email,
        role: Role.Professor,
      }));

      return { data, total, page, limit };
    } catch {
      throw new InternalServerErrorException('Failed to fetch advisors.');
    }
  }

  async setSchedule(input: SetScheduleInput): Promise<ScheduleResponse> {
    if (!input.coordinatorId) {
      throw new ForbiddenException('Invalid authenticated user.');
    }

    const start = new Date(input.startDatetime);
    const end = new Date(input.endDatetime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Schedule datetimes must be valid dates.');
    }

    if (end.getTime() <= start.getTime()) {
      throw new BadRequestException(
        'endDatetime must be greater than startDatetime.',
      );
    }

    try {
      await this.scheduleModel
        .updateMany(
          { phase: input.phase, isActive: true },
          { $set: { isActive: false } },
        )
        .exec();

      const createdSchedule = await this.scheduleModel.create({
        coordinatorId: input.coordinatorId,
        phase: input.phase,
        startDatetime: start,
        endDatetime: end,
        isActive: true,
      });
      const createdScheduleWithTimestamp = createdSchedule as unknown as {
        createdAt?: Date;
      };
      const createdAt =
        createdScheduleWithTimestamp.createdAt instanceof Date
          ? createdScheduleWithTimestamp.createdAt
          : new Date();

      return {
        scheduleId: createdSchedule.scheduleId,
        coordinatorId: createdSchedule.coordinatorId,
        phase: createdSchedule.phase,
        startDatetime: createdSchedule.startDatetime.toISOString(),
        endDatetime: createdSchedule.endDatetime.toISOString(),
        createdAt: createdAt.toISOString(),
      };
    } catch {
      throw new InternalServerErrorException('Failed to set schedule.');
    }
  }

  async getActiveSchedule(
    phase: SchedulePhase,
  ): Promise<ActiveScheduleResponse> {
    const schedule = await this.getLatestScheduleByPhase(phase);

    if (!schedule) {
      throw new NotFoundException(`No schedule found for phase ${phase}.`);
    }

    const now = Date.now();
    const start = new Date(schedule.startDatetime).getTime();
    const end = new Date(schedule.endDatetime).getTime();

    return {
      scheduleId: schedule.scheduleId ?? '',
      coordinatorId: schedule.coordinatorId,
      phase: schedule.phase,
      startDatetime: new Date(schedule.startDatetime).toISOString(),
      endDatetime: new Date(schedule.endDatetime).toISOString(),
      createdAt: (schedule.createdAt ?? new Date()).toISOString(),
      isOpen: now >= start && now <= end,
    };
  }

  async submitRequest(input: SubmitRequestInput): Promise<AdvisorRequest> {
    if (!input.submittedBy) {
      throw new ForbiddenException('Invalid authenticated user.');
    }

    const advisorRoleFilters = getAdvisorRoleFilters();

    try {
      const group = await this.groupModel
        .findOne({
          leaderUserId: input.submittedBy,
          status: GroupStatus.ACTIVE,
        })
        .lean<Group>()
        .exec();

      if (!group) {
        throw new NotFoundException(
          'No active group found for this team leader.',
        );
      }

      if (
        group.assignmentStatus === GroupAssignmentStatus.ASSIGNED &&
        group.assignedAdvisorId
      ) {
        throw new HttpException(
          'Group is already assigned to an advisor.',
          423,
        );
      }

      const advisor = await this.userModel
        .findOne({
          _id: input.requestedAdvisorId,
          role: { $in: advisorRoleFilters },
        })
        .lean<User>()
        .exec();

      if (!advisor) {
        throw new NotFoundException('Requested advisor was not found.');
      }

      const scheduleOpen = await this.isAdvisorSelectionOpen();
      if (!scheduleOpen) {
        throw new ForbiddenException(
          'Advisor selection schedule window is not currently open.',
        );
      }

      const createdRequest = await this.advisorRequestModel.create({
        groupId: group.groupId,
        submittedBy: input.submittedBy,
        requestedAdvisorId: input.requestedAdvisorId,
        status: AdvisorRequestStatus.PENDING,
      });

      await this.notificationsService.notifyAdvisorRequestSubmitted({
        recipientUserId: input.requestedAdvisorId,
        groupId: group.groupId,
      });

      return createdRequest;
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException ||
        error instanceof HttpException
      ) {
        throw error;
      }

      if (this.isMongoDuplicateKeyError(error)) {
        throw new ConflictException(
          'A pending advisor request already exists for this group.',
        );
      }

      throw new InternalServerErrorException(
        'Failed to submit advisor request.',
      );
    }
  }

  async decideRequest(input: DecideRequestInput): Promise<AdvisorRequest> {
    if (!input.advisorId) {
      throw new ForbiddenException('Invalid authenticated user.');
    }

    try {
      const existingRequest = await this.advisorRequestModel
        .findOne({ requestId: input.requestId })
        .lean<AdvisorRequest>()
        .exec();

      if (!existingRequest) {
        throw new NotFoundException('Advisor request was not found.');
      }

      if (existingRequest.requestedAdvisorId !== input.advisorId) {
        throw new ForbiddenException(
          'You are not allowed to decide this advisor request.',
        );
      }

      if (existingRequest.status !== AdvisorRequestStatus.PENDING) {
        throw new ConflictException(
          'Advisor request is not in a pending state.',
        );
      }

      const nextStatus =
        input.decision === AdvisorDecision.APPROVE
          ? AdvisorRequestStatus.APPROVED
          : AdvisorRequestStatus.REJECTED;

      const decidedRequest = await this.advisorRequestModel
        .findOneAndUpdate(
          {
            requestId: input.requestId,
            requestedAdvisorId: input.advisorId,
            status: AdvisorRequestStatus.PENDING,
          },
          { $set: { status: nextStatus } },
          { returnDocument: 'after' },
        )
        .lean<AdvisorRequest>()
        .exec();

      if (!decidedRequest) {
        throw new ConflictException('Advisor request is no longer pending.');
      }

      if (input.decision === AdvisorDecision.APPROVE) {
        await this.advisorRequestModel
          .updateMany(
            {
              groupId: decidedRequest.groupId,
              requestId: { $ne: decidedRequest.requestId },
              status: AdvisorRequestStatus.APPROVED,
            },
            { $set: { status: AdvisorRequestStatus.REJECTED } },
          )
          .exec();

        await this.advisorRequestModel
          .updateMany(
            {
              groupId: decidedRequest.groupId,
              requestId: { $ne: decidedRequest.requestId },
              status: AdvisorRequestStatus.PENDING,
            },
            { $set: { status: AdvisorRequestStatus.REJECTED } },
          )
          .exec();

        await this.groupModel
          .updateOne(
            { groupId: decidedRequest.groupId, status: GroupStatus.ACTIVE },
            {
              $set: {
                assignmentStatus: GroupAssignmentStatus.ASSIGNED,
                assignedAdvisorId: input.advisorId,
              },
            },
          )
          .exec();
      }

      const updatedRequest = await this.advisorRequestModel
        .findOne({
          requestId: input.requestId,
          requestedAdvisorId: input.advisorId,
        })
        .lean<AdvisorRequest>()
        .exec();

      if (!updatedRequest) {
        throw new InternalServerErrorException(
          'Failed to decide advisor request.',
        );
      }

      if (input.decision === AdvisorDecision.APPROVE) {
        await this.notificationsService.notifyAdvisorRequestApproved({
          recipientUserId: updatedRequest.submittedBy,
          groupId: updatedRequest.groupId,
          requestId: updatedRequest.requestId,
        });
      } else {
        await this.notificationsService.notifyAdvisorRequestRejected({
          recipientUserId: updatedRequest.submittedBy,
          groupId: updatedRequest.groupId,
          requestId: updatedRequest.requestId,
        });
      }

      return updatedRequest;
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException ||
        error instanceof HttpException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to decide advisor request.',
      );
    }
  }

  async withdrawRequest(input: WithdrawRequestInput): Promise<AdvisorRequest> {
    if (!input.teamLeaderId) {
      throw new ForbiddenException('Invalid authenticated user.');
    }

    try {
      const existingRequest = await this.advisorRequestModel
        .findOne({ requestId: input.requestId })
        .lean<AdvisorRequest>()
        .exec();

      if (!existingRequest) {
        throw new NotFoundException('Advisor request was not found.');
      }

      if (existingRequest.submittedBy !== input.teamLeaderId) {
        throw new ForbiddenException(
          'You are not allowed to withdraw this advisor request.',
        );
      }

      if (existingRequest.status !== AdvisorRequestStatus.PENDING) {
        throw new ConflictException(
          'Advisor request is not in a pending state.',
        );
      }

      const withdrawnRequest = await this.advisorRequestModel
        .findOneAndUpdate(
          {
            requestId: input.requestId,
            submittedBy: input.teamLeaderId,
            status: AdvisorRequestStatus.PENDING,
          },
          { $set: { status: AdvisorRequestStatus.WITHDRAWN } },
          { returnDocument: 'after' },
        )
        .lean<AdvisorRequest>()
        .exec();

      if (!withdrawnRequest) {
        throw new ConflictException('Advisor request is no longer pending.');
      }

      const updatedRequest = await this.advisorRequestModel
        .findOne({
          requestId: input.requestId,
          submittedBy: input.teamLeaderId,
        })
        .lean<AdvisorRequest>()
        .exec();

      if (!updatedRequest) {
        throw new InternalServerErrorException(
          'Failed to withdraw advisor request.',
        );
      }

      await this.notificationsService.notifyAdvisorRequestWithdrawn({
        recipientUserId: updatedRequest.requestedAdvisorId,
        groupId: updatedRequest.groupId,
        requestId: updatedRequest.requestId,
      });

      return updatedRequest;
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException ||
        error instanceof HttpException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to withdraw advisor request.',
      );
    }
  }

  async releaseTeam(
    input: ReleaseTeamInput,
  ): Promise<GroupAssignmentStatusResponse> {
    if (!input.callerId || !input.callerRole) {
      throw new ForbiddenException('Invalid authenticated user.');
    }

    const callerRole = input.callerRole as Role;
    const isCoordinator = callerRole === Role.Coordinator;
    const isAdvisor = callerRole === Role.Professor;

    if (!isCoordinator && !isAdvisor) {
      throw new ForbiddenException(
        'You are not allowed to release this group.',
      );
    }

    if (isAdvisor && input.callerId !== input.advisorId) {
      throw new ForbiddenException(
        'You are not allowed to release another advisor assignment.',
      );
    }

    try {
      const existingGroup = await this.groupModel
        .findOne({ groupId: input.groupId })
        .lean<Group>()
        .exec();

      if (!existingGroup) {
        throw new NotFoundException('Group was not found.');
      }

      if (existingGroup.status === GroupStatus.DISBANDED) {
        return this.buildGroupAssignmentStatus(existingGroup, null);
      }

      if (existingGroup.assignmentStatus === GroupAssignmentStatus.UNASSIGNED) {
        return this.buildGroupAssignmentStatus(existingGroup, null);
      }

      if (existingGroup.assignedAdvisorId !== input.advisorId) {
        throw new NotFoundException('Advisor-group association was not found.');
      }

      if (isAdvisor && existingGroup.assignedAdvisorId !== input.callerId) {
        throw new ForbiddenException(
          'You are not allowed to release another advisor assignment.',
        );
      }

      const advisor = await this.userModel
        .findOne({
          _id: input.advisorId,
          role: { $in: getAdvisorRoleFilters() },
        })
        .lean<User>()
        .exec();

      const updatedGroup = await this.groupModel
        .findOneAndUpdate(
          {
            groupId: input.groupId,
            assignmentStatus: GroupAssignmentStatus.ASSIGNED,
            assignedAdvisorId: input.advisorId,
          },
          {
            $set: {
              assignmentStatus: GroupAssignmentStatus.UNASSIGNED,
              assignedAdvisorId: null,
            },
          },
          { returnDocument: 'after' },
        )
        .lean<Group>()
        .exec();

      if (!updatedGroup) {
        const groupAfterAttempt = await this.groupModel
          .findOne({ groupId: input.groupId })
          .lean<Group>()
          .exec();

        if (
          groupAfterAttempt &&
          groupAfterAttempt.assignmentStatus ===
            GroupAssignmentStatus.UNASSIGNED
        ) {
          return this.buildGroupAssignmentStatus(groupAfterAttempt, null);
        }

        throw new NotFoundException('Advisor-group association was not found.');
      }

      await this.notificationsService.notifyAdvisorReleased({
        recipientUserId: input.advisorId,
        groupId: updatedGroup.groupId,
      });

      return this.buildGroupAssignmentStatus(updatedGroup, advisor ?? null);
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException ||
        error instanceof HttpException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to release group advisor.',
      );
    }
  }

  async listRequests(
    input: ListRequestsInput,
  ): Promise<PaginatedRequestsResponse> {
    const filter: Record<string, unknown> = {};

    if (input.callerRole === Role.TeamLeader) {
      const group = await this.groupModel
        .findOne({ leaderUserId: input.callerId, status: GroupStatus.ACTIVE })
        .lean<Group>()
        .exec();
      if (!group) {
        throw new NotFoundException('No active group found for this team leader.');
      }
      filter.groupId = group.groupId;
    } else if (input.callerRole === Role.Professor) {
      filter.requestedAdvisorId = input.callerId;
    } else {
      if (input.requestedAdvisorId) {
        filter.requestedAdvisorId = input.requestedAdvisorId;
      }
    }

    if (input.status) {
      filter.status = input.status;
    }

    const skip = (input.page - 1) * input.limit;

    try {
      const [data, total] = await Promise.all([
        this.advisorRequestModel
          .find(filter)
          .skip(skip)
          .limit(input.limit)
          .lean<AdvisorRequest[]>()
          .exec(),
        this.advisorRequestModel.countDocuments(filter).exec(),
      ]);

      return { data, total, page: input.page, limit: input.limit };
    } catch {
      throw new InternalServerErrorException('Failed to list advisor requests.');
    }
  }

  async getGroupStatus(groupId: string): Promise<GroupAssignmentStatusResponse> {
    const group = await this.groupModel
      .findOne({ groupId })
      .lean<Group>()
      .exec();

    if (!group) {
      throw new NotFoundException('Group was not found.');
    }

    let advisor: Pick<User, 'email'> | null = null;
    if (group.assignedAdvisorId) {
      advisor = await this.userModel
        .findOne({ _id: group.assignedAdvisorId })
        .lean<User>()
        .exec();
    }

    return this.buildGroupAssignmentStatus(group, advisor);
  }

  async transferAdvisor(
    input: TransferAdvisorInput,
  ): Promise<GroupAssignmentStatusResponse> {
    if (input.currentAdvisorId === input.newAdvisorId) {
      throw new BadRequestException(
        'newAdvisorId must differ from currentAdvisorId.',
      );
    }

    try {
      const group = await this.groupModel
        .findOne({ groupId: input.groupId })
        .lean<Group>()
        .exec();

      if (!group) {
        throw new NotFoundException('Group was not found.');
      }

      if (group.status === GroupStatus.DISBANDED) {
        throw new ConflictException('Group is disbanded.');
      }

      if (group.assignedAdvisorId !== input.currentAdvisorId) {
        throw new BadRequestException(
          "currentAdvisorId does not match the group's current advisor.",
        );
      }

      const newAdvisor = await this.userModel
        .findOne({
          _id: input.newAdvisorId,
          role: { $in: getAdvisorRoleFilters() },
        })
        .lean<User>()
        .exec();

      if (!newAdvisor) {
        throw new NotFoundException('New advisor was not found.');
      }

      const updatedGroup = await this.groupModel
        .findOneAndUpdate(
          { groupId: input.groupId, assignedAdvisorId: input.currentAdvisorId },
          { $set: { assignedAdvisorId: input.newAdvisorId } },
          { returnDocument: 'after' },
        )
        .lean<Group>()
        .exec();

      if (!updatedGroup) {
        throw new InternalServerErrorException('Failed to transfer advisor.');
      }

      await this.notificationsService.notifyAdvisorReleased({
        recipientUserId: input.currentAdvisorId,
        groupId: input.groupId,
      });

      return this.buildGroupAssignmentStatus(updatedGroup, newAdvisor);
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof HttpException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to transfer advisor.');
    }
  }

  async disbandGroup(groupId: string): Promise<void> {
    const group = await this.groupModel
      .findOne({ groupId })
      .lean<Group>()
      .exec();

    if (!group) {
      throw new NotFoundException('Group was not found.');
    }

    if (group.status === GroupStatus.DISBANDED) {
      return;
    }

    if (group.assignmentStatus === GroupAssignmentStatus.ASSIGNED) {
      throw new ConflictException(
        'Group is currently assigned to an advisor. Release the advisor first.',
      );
    }

    try {
      await this.groupModel
        .updateOne({ groupId }, { $set: { status: GroupStatus.DISBANDED } })
        .exec();

      await this.advisorRequestModel.deleteMany({ groupId }).exec();

      await this.userModel
        .updateMany({ teamId: groupId }, { $set: { teamId: null } })
        .exec();
    } catch {
      throw new InternalServerErrorException('Failed to disband group.');
    }
  }

  private buildGroupAssignmentStatus(
    group: Group,
    advisor: Pick<User, 'email'> | null,
  ): GroupAssignmentStatusResponse {
    if (group.status === GroupStatus.DISBANDED) {
      return {
        groupId: group.groupId,
        status: 'DISBANDED',
        advisorId: null,
        advisorName: null,
        canSubmitRequest: false,
        blockedReason: 'Group is disbanded.',
        updatedAt: new Date().toISOString(),
      };
    }

    if (group.assignmentStatus === GroupAssignmentStatus.ASSIGNED) {
      return {
        groupId: group.groupId,
        status: GroupAssignmentStatus.ASSIGNED,
        advisorId: group.assignedAdvisorId,
        advisorName: advisor?.email ?? null,
        canSubmitRequest: false,
        blockedReason: 'Group is already assigned to an advisor.',
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      groupId: group.groupId,
      status: GroupAssignmentStatus.UNASSIGNED,
      advisorId: null,
      advisorName: null,
      canSubmitRequest: true,
      blockedReason: null,
      updatedAt: new Date().toISOString(),
    };
  }

  private isMongoDuplicateKeyError(error: unknown): error is { code: number } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'number' &&
      error.code === 11000
    );
  }

  private async isAdvisorSelectionOpen(): Promise<boolean> {
    const schedule = await this.getLatestScheduleByPhase(
      SchedulePhase.ADVISOR_SELECTION,
    );

    if (!schedule) {
      return false;
    }

    const now = Date.now();
    const start = new Date(schedule.startDatetime).getTime();
    const end = new Date(schedule.endDatetime).getTime();

    return now >= start && now <= end;
  }

  private async getLatestScheduleByPhase(
    phase: SchedulePhase,
  ): Promise<ScheduleRecord | null> {
    return this.scheduleModel
      .findOne({ phase, isActive: true })
      .sort({ createdAt: -1 })
      .lean<ScheduleRecord>()
      .exec();
  }
}
