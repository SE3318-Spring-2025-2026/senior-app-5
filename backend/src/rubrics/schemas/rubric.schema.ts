import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';

export class Question {
  @Prop({ type: String, default: () => randomUUID() })
  questionId!: string;

  @Prop({ type: String, required: true })
  criteriaName!: string;

  @Prop({ type: Number, required: true })
  criteriaWeight!: number;
}

const QuestionSchema = SchemaFactory.createForClass(Question);

export type RubricDocument = HydratedDocument<Rubric>;

@Schema({ timestamps: true })
export class Rubric {
  @Prop({
    type: String,
    default: () => randomUUID(),
    unique: true,
    index: true,
  })
  rubricId!: string;

  @Prop({ type: String, required: true, index: true })
  deliverableId!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: Boolean, default: false, index: true })
  isActive!: boolean;

  @Prop({ type: [QuestionSchema], required: true, minlength: 1 })
  questions!: Question[];
}

export const RubricSchema = SchemaFactory.createForClass(Rubric);

// Create compound index for efficient active rubric queries
RubricSchema.index({ deliverableId: 1, isActive: 1 });
