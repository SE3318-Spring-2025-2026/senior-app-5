import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';

export type SprintStoryDocument = HydratedDocument<SprintStory>;

@Schema({ timestamps: true })
export class SprintStory {
  @Prop({ type: String, default: () => randomUUID() })
  storyId!: string;

  @Prop({ required: true, index: true })
  teamId!: string;

  @Prop({ required: true })
  issueKey!: string;

  @Prop({ required: true })
  summary!: string;

  @Prop({ required: true })
  status!: string;

  @Prop({ required: true, default: false })
  githubBranchFound!: boolean;

  @Prop({ required: true, default: false })
  githubPrFound!: boolean;

  @Prop({ required: true })
  syncRunId!: string;

  @Prop({ type: Date, default: Date.now })
  syncedAt!: Date;
}

export const SprintStorySchema = SchemaFactory.createForClass(SprintStory);


SprintStorySchema.index({ teamId: 1, issueKey: 1 }, { unique: true });