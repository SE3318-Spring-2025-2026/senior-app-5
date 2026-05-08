import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type ActivityLogDocument = HydratedDocument<ActivityLog>;

@Schema({ collection: 'activity_logs' })
export class ActivityLog {
  @Prop({ required: true, index: true })
  eventType!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', index: true })
  actorUserId?: Types.ObjectId;

  @Prop()
  actorRole?: string;

  @Prop()
  targetType?: string;

  @Prop()
  targetId?: string;

  @Prop({ required: true })
  summary!: string;

  @Prop({ type: SchemaTypes.Mixed })
  metadata?: Record<string, unknown>;

  @Prop({ type: Date, default: () => new Date(), index: true })
  timestamp!: Date;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

ActivityLogSchema.index({ timestamp: -1, _id: -1 });
