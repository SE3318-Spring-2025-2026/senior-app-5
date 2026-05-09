import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ActivityLog,
  ActivityLogDocument,
} from './schemas/activity-log.schema';
import { ListActivityLogsQueryDto } from './dto/list-activity-logs-query.dto';
import { ActivityLogDto } from './dto/activity-log.dto';
import { PaginatedActivityLogsDto } from './dto/paginated-activity-logs.dto';
import { CreateActivityLogInput } from './dto/create-activity-log.input';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'hash',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'authorization',
  'apikey',
  'jwt',
]);

const REDACTED = '[REDACTED]';

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class ActivityLogsService {
  private readonly logger = new Logger(ActivityLogsService.name);

  constructor(
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLogDocument>,
  ) {}

  redactMetadata<T>(value: T): T {
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) {
      return value.map((v) => this.redactMetadata(v)) as unknown as T;
    }
    if (typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (SENSITIVE_KEYS.has(k.toLowerCase())) {
          out[k] = REDACTED;
        } else {
          out[k] = this.redactMetadata(v);
        }
      }
      return out as unknown as T;
    }
    return value;
  }

  async create(input: CreateActivityLogInput): Promise<ActivityLogDocument> {
    try {
      const doc = await this.activityLogModel.create({
        eventType: input.eventType,
        summary: input.summary,
        actorUserId:
          typeof input.actorUserId === 'string'
            ? new Types.ObjectId(input.actorUserId)
            : input.actorUserId,
        actorRole: input.actorRole,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: input.metadata
          ? this.redactMetadata(input.metadata)
          : undefined,
        timestamp: input.timestamp ?? new Date(),
      });
      return doc;
    } catch (err) {
      this.logger.error(
        `Failed to persist activity log: ${(err as Error).message}`,
      );
      throw new InternalServerErrorException('Failed to record activity');
    }
  }

  async findPaginated(
    query: ListActivityLogsQueryDto,
  ): Promise<PaginatedActivityLogsDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const filter: {
      eventType?: string;
      actorUserId?: Types.ObjectId;
      timestamp?: { $gte?: Date; $lte?: Date };
      summary?: { $regex: string; $options: 'i' };
    } = {};

    if (query.eventType) filter.eventType = query.eventType;
    if (query.actorUserId)
      filter.actorUserId = new Types.ObjectId(query.actorUserId);

    if (query.from || query.to) {
      const range: Record<string, Date> = {};
      if (query.from) range.$gte = new Date(query.from);
      if (query.to) range.$lte = new Date(query.to);
      if (range.$gte && range.$lte && range.$gte > range.$lte) {
        throw new BadRequestException('"from" must be earlier than "to"');
      }
      filter.timestamp = range;
    }

    if (query.search) {
      filter.summary = { $regex: escapeRegex(query.search), $options: 'i' };
    }

    let docs: ActivityLogDocument[];
    let total: number;
    try {
      [docs, total] = await Promise.all([
        this.activityLogModel
          .find(filter)
          .sort({ timestamp: -1, _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean<ActivityLogDocument[]>()
          .exec(),
        this.activityLogModel.countDocuments(filter).exec(),
      ]);
    } catch (err) {
      this.logger.error(
        `Failed to query activity logs: ${(err as Error).message}`,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve activity logs',
      );
    }

    return {
      data: docs.map((d) => this.toDto(d)),
      page,
      limit,
      total,
    };
  }

  private toDto(doc: ActivityLogDocument): ActivityLogDto {
    const raw = doc as unknown as Record<string, unknown>;
    const id = (raw._id as { toString(): string }).toString();
    return {
      id,
      timestamp: raw.timestamp as Date,
      eventType: raw.eventType as string,
      actorUserId: raw.actorUserId
        ? (raw.actorUserId as { toString(): string }).toString()
        : null,
      actorRole: (raw.actorRole as string | undefined) ?? null,
      targetType: (raw.targetType as string | undefined) ?? null,
      targetId: (raw.targetId as string | undefined) ?? null,
      summary: raw.summary as string,
      metadata: raw.metadata
        ? this.redactMetadata(raw.metadata as Record<string, unknown>)
        : null,
    };
  }
}
