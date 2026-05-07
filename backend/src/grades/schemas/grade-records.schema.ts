import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StudentFinalGradeDocument = HydratedDocument<StudentFinalGrade>;
export type GroupFinalGradeDocument = HydratedDocument<GroupFinalGrade>;
export type GradeHistoryEntryDocument = HydratedDocument<GradeHistoryEntry>;

@Schema({ timestamps: true })
export class StudentFinalGrade {
  @Prop({ type: String, default: () => randomUUID() })
  studentFinalGradeId!: string;

  @Prop({ type: String, required: true, index: true })
  studentId!: string;

  @Prop({ type: String, required: true, index: true })
  groupId!: string;

  @Prop({ type: Number, required: true })
  individualAllowanceRatio!: number;

  @Prop({ type: Number, required: true })
  finalGrade!: number;

  @Prop({ type: Date, default: () => new Date() })
  calculatedAt!: Date;
}

@Schema({ timestamps: true })
export class GroupFinalGrade {
  @Prop({ type: String, default: () => randomUUID() })
  groupFinalGradeId!: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  groupId!: string;

  @Prop({ type: Number, required: true })
  teamGrade!: number;

  @Prop({ type: Date, default: () => new Date() })
  calculatedAt!: Date;
}

@Schema({ timestamps: true })
export class GradeHistoryEntry {
  @Prop({ type: String, default: () => randomUUID() })
  gradeChangeId!: string;

  @Prop({ type: String, required: true, index: true })
  groupId!: string;

  @Prop({ type: Number, required: true })
  teamGrade!: number;

  @Prop({ type: Object, required: true })
  gradeComponents!: Record<string, unknown>;

  @Prop({ type: String, required: true })
  triggeredBy!: string;

  @Prop({ type: Date, default: () => new Date(), index: true })
  changedAt!: Date;
}

export const StudentFinalGradeSchema =
  SchemaFactory.createForClass(StudentFinalGrade);
export const GroupFinalGradeSchema = SchemaFactory.createForClass(GroupFinalGrade);
export const GradeHistoryEntrySchema =
  SchemaFactory.createForClass(GradeHistoryEntry);
