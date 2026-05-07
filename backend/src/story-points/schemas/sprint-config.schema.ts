import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';

export type SprintConfigDocument = HydratedDocument<SprintConfig>;

/**
 * Maps a deliverable to this sprint with a contribution percentage.
 * Used by Process 8 (Grade Calculation) to determine which sprint evaluations
 * contribute to which deliverable's team scalar.
 */
@Schema({ _id: false })
export class DeliverableMapping {
  /** The deliverable (D1) this sprint contributes to. */
  @Prop({ type: String, required: true })
  deliverableId!: string;

  /** Percentage of this deliverable's scalar that this sprint contributes (0–100). */
  @Prop({ type: Number, required: true, min: 0, max: 100 })
  contributionPercentage!: number;
}

export const DeliverableMappingSchema =
  SchemaFactory.createForClass(DeliverableMapping);

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

  /**
   * Deliverables this sprint contributes to, with their contribution percentages.
   * Populated by Process 1 (Sprint Configuration) and consumed by Process 8.
   */
  @Prop({ type: [DeliverableMappingSchema], default: [] })
  deliverableMappings!: DeliverableMapping[];
}

export const SprintConfigSchema = SchemaFactory.createForClass(SprintConfig);

SprintConfigSchema.index({ groupId: 1, sprintId: 1 }, { unique: true });

