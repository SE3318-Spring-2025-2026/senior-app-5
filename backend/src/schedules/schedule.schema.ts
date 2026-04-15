import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';

export type ScheduleDocument = HydratedDocument<Schedule>;

export enum SchedulePhase {
  ADVISOR_SELECTION = 'ADVISOR_SELECTION',
  COMMITTEE_ASSIGNMENT = 'COMMITTEE_ASSIGNMENT',
}

@Schema({ timestamps: true })
export class Schedule {
  @Prop({ type: String, default: () => randomUUID(), unique: true })
  scheduleId!: string;

  @Prop({ required: true })
  coordinatorId!: string;

  @Prop({ type: String, enum: SchedulePhase, required: true })
  phase!: SchedulePhase;

  @Prop({ required: true })
  startDatetime!: Date;

  @Prop({ required: true })
  endDatetime!: Date;

  @Prop({ type: Boolean, default: false })
  superseded!: boolean;
}

export const ScheduleSchema = SchemaFactory.createForClass(Schedule);
