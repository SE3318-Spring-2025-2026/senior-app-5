import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';

export type SprintConfigDocument = HydratedDocument<SprintConfig>;

@Schema({ timestamps: true })
export class SprintConfig {
  @Prop({ type: String, default: () => randomUUID(), unique: true })
  sprintId!: string;

  @Prop({ required: true, index: true })
  groupId!: string;

  @Prop({ required: true, min: 0 })
  targetStoryPoints!: number;

  @Prop({ required: true })
  startDate!: Date;

  @Prop({ required: true })
  endDate!: Date;

  @Prop({ type: String, default: 'SCRUM' })
  phase!: string;
}

export const SprintConfigSchema = SchemaFactory.createForClass(SprintConfig);

SprintConfigSchema.index({ groupId: 1, sprintId: 1 }, { unique: true });
