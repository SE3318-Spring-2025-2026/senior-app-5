import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema()
export class Notification {
  @Prop({ required: true })
  recipientUserId: string;

  @Prop({ required: false, default: null, type: String })
  groupId?: string | null;

  @Prop({ required: true })
  type: string;

  /** Optional structured payload (e.g. sprint reminder details). */
  @Prop({ type: SchemaTypes.Mixed, default: null })
  data?: Record<string, unknown> | null;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
