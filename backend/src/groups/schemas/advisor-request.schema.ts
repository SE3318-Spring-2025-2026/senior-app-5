import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AdvisorRequestDocument = HydratedDocument<AdvisorRequest>;

export enum AdvisorRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Schema({ timestamps: true })
export class AdvisorRequest {
  @Prop({ required: true })
  groupId!: string;

  @Prop({ required: true, enum: AdvisorRequestStatus })
  status!: AdvisorRequestStatus;
}

export const AdvisorRequestSchema = SchemaFactory.createForClass(AdvisorRequest);
