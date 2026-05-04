import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DeliverableEvaluationDocument = HydratedDocument<DeliverableEvaluation>;

export enum DeliverableEvaluationStatus {
  PENDING = 'PENDING',
  GRADED = 'GRADED',
}

export enum DeliverableGrade {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  F = 'F',
}

/** Maps a soft-grade letter to its numeric value per the project definition. */
export function deliverableGradeValue(grade: DeliverableGrade): number {
  switch (grade) {
    case DeliverableGrade.A:
      return 100;
    case DeliverableGrade.B:
      return 80;
    case DeliverableGrade.C:
      return 60;
    case DeliverableGrade.D:
      return 50;
    case DeliverableGrade.F:
    default:
      return 0;
  }
}

/**
 * Records the grade awarded by a committee member for a group's deliverable.
 * Consumed read-only by Process 8 (Grade Calculation).
 */
@Schema({ timestamps: true })
export class DeliverableEvaluation {
  @Prop({ type: String, default: () => randomUUID(), unique: true })
  evaluationId!: string;

  @Prop({ type: String, required: true, index: true })
  groupId!: string;

  @Prop({ type: String, required: true, index: true })
  deliverableId!: string;

  /** Soft-grade letter submitted by the committee member. */
  @Prop({
    type: String,
    required: true,
    enum: Object.values(DeliverableGrade),
  })
  deliverableGrade!: DeliverableGrade;

  /**
   * Numeric equivalent of deliverableGrade (100/80/60/50/0).
   * Computed and stored on creation so Process 8 can read it directly.
   */
  @Prop({ type: Number, required: true, min: 0, max: 100 })
  rawGrade!: number;

  /** Whether the grade has been finalised. Pipeline requires all to be GRADED. */
  @Prop({
    type: String,
    required: true,
    enum: Object.values(DeliverableEvaluationStatus),
    default: DeliverableEvaluationStatus.PENDING,
  })
  status!: DeliverableEvaluationStatus;

  /** userId extracted from the JWT of the committee member who submitted the grade. */
  @Prop({ type: String, required: true })
  gradedBy!: string;
}

export const DeliverableEvaluationSchema =
  SchemaFactory.createForClass(DeliverableEvaluation);

// Unique: one grade per group per deliverable.
DeliverableEvaluationSchema.index(
  { groupId: 1, deliverableId: 1 },
  { unique: true },
);
