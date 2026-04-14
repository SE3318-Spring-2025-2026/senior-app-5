import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AdvisorRequestDocument = HydratedDocument<AdvisorRequest>;

export enum AdvisorRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

@Schema({ timestamps: true })
export class AdvisorRequest {
  @Prop({ type: String, default: () => randomUUID() })
  requestId!: string;

  @Prop({ required: true })
  groupId!: string;

  @Prop({ required: true })
  submittedBy!: string;

  @Prop({ required: true })
  requestedAdvisorId!: string;

  @Prop({
    type: String,
    enum: Object.values(AdvisorRequestStatus),
    default: AdvisorRequestStatus.PENDING,
  })
  status!: AdvisorRequestStatus;
}

export const AdvisorRequestSchema =
  SchemaFactory.createForClass(AdvisorRequest);

AdvisorRequestSchema.index(
  { groupId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: AdvisorRequestStatus.PENDING },
  },
);
