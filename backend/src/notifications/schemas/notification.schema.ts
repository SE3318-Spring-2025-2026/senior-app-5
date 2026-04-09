import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema()
export class Notification {
  @Prop({ required: true })
  recipientUserId: string;

  @Prop({ required: true })
  groupId: string;

  @Prop({ required: true })
  type: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
