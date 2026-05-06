import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';

export type CommitteeEvaluationDocument = HydratedDocument<CommitteeEvaluation>;

export enum EvaluationGrade {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  F = 'F',
}

@Schema({ timestamps: true })
export class CommitteeEvaluation {
  @Prop({ type: String, default: () => randomUUID() })
  id!: string;

  @Prop({ required: true })
  groupId!: string;

  @Prop({ required: true })
  deliverableId!: string;

  @Prop({ required: true })
  submissionId!: string;

  @Prop({ required: true })
  memberId!: string;

  @Prop({ required: true, enum: EvaluationGrade })
  grade!: EvaluationGrade;
}

export const CommitteeEvaluationSchema =
  SchemaFactory.createForClass(CommitteeEvaluation);
