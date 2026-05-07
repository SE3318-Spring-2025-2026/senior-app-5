import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ScheduleDocument = HydratedDocument<Schedule>;

export enum SchedulePhase {
  ADVISOR_SELECTION = 'ADVISOR_SELECTION',
  COMMITTEE_ASSIGNMENT = 'COMMITTEE_ASSIGNMENT',
  SPRINT = 'SPRINT',
}

@Schema({ timestamps: true })
export class Schedule {
  @Prop({ type: String, default: () => randomUUID() })
  scheduleId!: string;

  @Prop({ required: true })
  coordinatorId!: string;

  @Prop({
    type: String,
    enum: Object.values(SchedulePhase),
    required: true,
  })
  phase!: SchedulePhase;

  @Prop({ type: Date, required: true })
  startDatetime!: Date;

  @Prop({ type: Date, required: true })
  endDatetime!: Date;

  @Prop({ default: true })
  isActive!: boolean;
}

export const ScheduleSchema = SchemaFactory.createForClass(Schedule);
ScheduleSchema.index({ phase: 1, createdAt: -1 });
