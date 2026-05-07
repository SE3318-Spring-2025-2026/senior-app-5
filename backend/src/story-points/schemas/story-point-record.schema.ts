import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';

export type StoryPointRecordDocument = HydratedDocument<StoryPointRecord>;

export enum StoryPointSource {
  JIRA_GITHUB = 'JIRA_GITHUB',
  COORDINATOR_OVERRIDE = 'COORDINATOR_OVERRIDE',
  MANUAL = 'MANUAL',
}

@Schema({ timestamps: true })
export class StoryPointRecord {
  @Prop({ type: String, default: () => randomUUID() })
  recordId!: string;

  @Prop({ required: true, index: true })
  studentId!: string;

  @Prop({ required: true, index: true })
  groupId!: string;

  @Prop({ required: true, index: true })
  sprintId!: string;

  @Prop({ required: true, min: 0 })
  completedPoints!: number;

  @Prop({ required: true, min: 0 })
  targetPoints!: number;

  @Prop({ required: true, enum: Object.values(StoryPointSource) })
  source!: StoryPointSource;
}

export const StoryPointRecordSchema =
  SchemaFactory.createForClass(StoryPointRecord);

StoryPointRecordSchema.index({ studentId: 1, sprintId: 1 }, { unique: true });
