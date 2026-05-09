import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SprintConfigDocument = HydratedDocument<SprintConfigEntry>;

@Schema({ _id: false })
export class SprintDeliverableMapping {
  @Prop({ type: String, required: true })
  deliverableId!: string;

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  contributionPercentage!: number;
}

export const SprintDeliverableMappingSchema = SchemaFactory.createForClass(
  SprintDeliverableMapping,
);

@Schema({ collection: 'sprintdefinitions', timestamps: true })
export class SprintConfigEntry {
  /** UUID provided by caller — must exist as a scheduleId in the Schedule collection. */
  @Prop({ type: String, required: true, unique: true })
  sprintId!: string;

  @Prop({ type: Number, required: true, min: 0 })
  targetStoryPoints!: number;

  @Prop({ type: [SprintDeliverableMappingSchema], default: [] })
  deliverableMappings!: SprintDeliverableMapping[];

  @Prop({ type: Boolean, default: false })
  isFinalized!: boolean;
}

export const SprintConfigEntrySchema =
  SchemaFactory.createForClass(SprintConfigEntry);
