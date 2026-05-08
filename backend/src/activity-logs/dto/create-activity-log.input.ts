import { Types } from 'mongoose';

export interface CreateActivityLogInput {
  eventType: string;
  summary: string;
  actorUserId?: Types.ObjectId | string;
  actorRole?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}
