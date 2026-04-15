import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Role } from '../auth/enums/role.enum';
import { Group, GroupDocument, GroupStatus } from '../groups/group.entity';
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

@Injectable()
export class AdvisorsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>,
    @InjectModel(AdvisorRequest.name)
    private readonly advisorRequestModel: Model<AdvisorRequestDocument>,
    @InjectModel(Schedule.name)
    private readonly scheduleModel: Model<ScheduleDocument>,
    @InjectConnection() private readonly connection: Connection,
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

      const alreadyAssigned = await this.advisorRequestModel
        .exists({
          groupId: group.groupId,
          status: AdvisorRequestStatus.APPROVED,
        })
        .exec();

      if (alreadyAssigned) {
        throw new HttpException(
          'Group is already assigned to an advisor.',
          423,
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

      const session = await this.connection.startSession();
      try {
        await session.withTransaction(async () => {
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
              { new: true, session },
            )
            .lean<AdvisorRequest>()
            .exec();

          if (!decidedRequest) {
            throw new ConflictException(
              'Advisor request is no longer pending.',
            );
          }

          if (input.decision === AdvisorDecision.APPROVE) {
            await this.advisorRequestModel
              .updateMany(
                {
                  groupId: decidedRequest.groupId,
                  requestId: { $ne: decidedRequest.requestId },
                  status: AdvisorRequestStatus.PENDING,
                },
                { $set: { status: AdvisorRequestStatus.REJECTED } },
                { session },
              )
              .exec();
          }
        });
      } finally {
        await session.endSession();
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
