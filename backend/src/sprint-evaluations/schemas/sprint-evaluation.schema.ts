import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SprintEvaluationDocument = HydratedDocument<SprintEvaluation>;

export enum SprintEvaluationType {
  SCRUM = 'SCRUM',
  CODE_REVIEW = 'CODE_REVIEW',
}

export enum SprintEvaluationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
}

export enum SoftGrade {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  F = 'F',
}

@Schema({ _id: false })
export class SprintEvaluationResponseItem {
  @Prop({ type: String, required: true })
  questionId!: string;

  @Prop({ type: String, required: true, enum: Object.values(SoftGrade) })
  softGrade!: SoftGrade;
}

export const SprintEvaluationResponseItemSchema = SchemaFactory.createForClass(
  SprintEvaluationResponseItem,
);

@Schema({ timestamps: true })
export class SprintEvaluation {
  @Prop({ type: String, default: () => randomUUID(), unique: true })
  evaluationId!: string;

  @Prop({ type: String, required: true })
  groupId!: string;

  @Prop({ type: String, required: true })
  sprintId!: string;

  @Prop({ type: String, required: true })
  deliverableId!: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(SprintEvaluationType),
  })
  evaluationType!: SprintEvaluationType;

  @Prop({ type: String, required: true })
  rubricId!: string;

  @Prop({ type: [SprintEvaluationResponseItemSchema], default: [] })
  responses!: SprintEvaluationResponseItem[];

  @Prop({ type: Number, required: true })
  averageScore!: number;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(SprintEvaluationStatus),
    default: SprintEvaluationStatus.DRAFT,
  })
  status!: SprintEvaluationStatus;
}

export const SprintEvaluationSchema =
  SchemaFactory.createForClass(SprintEvaluation);
SprintEvaluationSchema.index(
  { groupId: 1, sprintId: 1, deliverableId: 1, evaluationType: 1 },
  { unique: true },
);
