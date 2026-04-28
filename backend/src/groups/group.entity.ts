import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';

export type GroupDocument = HydratedDocument<Group>;

export enum GroupStatus {
  ACTIVE = 'Active',
  DISBANDED = 'Disbanded',
}

@Schema({ timestamps: true })
export class Group {
  @Prop({ type: String, default: () => randomUUID() })
  groupId!: string;

  @Prop({ required: true })
  groupName!: string;

  @Prop({ required: true })
  leaderUserId!: string;

  @Prop({ type: [String], default: [] })
  members!: string[];

  @Prop({ type: Number, default: 0 })
  memberCount!: number;

  @Prop({
    type: String,
    enum: GroupStatus,
    default: GroupStatus.ACTIVE,
  })
  status!: GroupStatus;
}

export const GroupSchema = SchemaFactory.createForClass(Group);
