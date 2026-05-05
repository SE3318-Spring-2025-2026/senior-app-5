import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RubricDocument = HydratedDocument<Rubric>;

/**
 * A question within a rubric, scored by an advisor during sprint evaluations.
 */
@Schema({ _id: false })
export class RubricQuestion {
  @Prop({ type: String, default: () => randomUUID() })
  questionId!: string;

  @Prop({ type: String, required: true, trim: true })
  criteriaName!: string;

  /** Weight as a decimal (0–1). Sum of all questions' weights must = 1.0. */
  @Prop({ type: Number, required: true, min: 0, max: 1 })
  criteriaWeight!: number;
}

export const RubricQuestionSchema = SchemaFactory.createForClass(RubricQuestion);

/**
 * A rubric defines the evaluation criteria and questions for a deliverable.
 * Only one active rubric per deliverable is allowed.
 * When a new rubric is created for the same deliverable, the previous active one is deactivated.
 */
@Schema({ timestamps: true })
export class Rubric {
  @Prop({ type: String, default: () => randomUUID(), unique: true })
  rubricId!: string;

  @Prop({ type: String, required: true, index: true })
  deliverableId!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  /**
   * Only one rubric per deliverable can have isActive=true.
   * This field is enforced at the service layer during creation/update.
   */
  @Prop({ type: Boolean, required: true, default: false, index: true })
  isActive!: boolean;

  @Prop({ type: [RubricQuestionSchema], default: [] })
  questions!: RubricQuestion[];
}

export const RubricSchema = SchemaFactory.createForClass(Rubric);

// Index for efficient active rubric lookup
RubricSchema.index({ deliverableId: 1, isActive: 1 }, { sparse: true });
