import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';

export type TeamInviteDocument = HydratedDocument<TeamInvite>;

export enum InviteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

@Schema({ timestamps: true })
export class TeamInvite {
  @Prop({ type: String, default: () => randomUUID() })
  inviteId!: string;

  @Prop({ required: true })
  groupId!: string;

  @Prop({ required: true })
  invitedUserId!: string;

  @Prop({ required: true })
  invitedByUserId!: string;

  @Prop({ type: String, enum: InviteStatus, default: InviteStatus.PENDING })
  status!: InviteStatus;
}

export const TeamInviteSchema = SchemaFactory.createForClass(TeamInvite);
