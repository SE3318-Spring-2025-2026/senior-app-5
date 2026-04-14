import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { getAdvisorRoleFilters, ROLES } from '../auth/constants/roles';
import { Group, GroupDocument, GroupStatus } from '../groups/group.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { User, UserDocument } from '../users/data/user.schema';
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

interface AdvisorRecord {
  _id?: { toString(): string } | string;
  id?: string;
  name?: string;
  email: string;
  role: string;
}

interface ScheduleRecord {
  startDatetime: Date;
  endDatetime: Date;
}

export interface SubmitRequestInput {
  requestedAdvisorId: string;
  submittedBy: string;
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
        role: ROLES.ADVISOR,
      }));

      return { data, total, page, limit };
    } catch {
      throw new InternalServerErrorException('Failed to fetch advisors.');
    }
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
    const schedule = await this.scheduleModel
      .findOne({ phase: SchedulePhase.ADVISOR_SELECTION })
      .sort({ createdAt: -1 })
      .lean<ScheduleRecord>()
      .exec();

    if (!schedule) {
      return false;
    }

    const now = Date.now();
    const start = new Date(schedule.startDatetime).getTime();
    const end = new Date(schedule.endDatetime).getTime();

    return now >= start && now <= end;
  }
}
