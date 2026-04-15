import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CommitteeGroupAssignmentDocument =
  HydratedDocument<CommitteeGroupAssignment>;

@Schema({ timestamps: true })
export class CommitteeGroupAssignment {
  @Prop({ required: true })
  committeeId!: string;

  @Prop({ required: true })
  groupId!: string;
}

export const CommitteeGroupAssignmentSchema = SchemaFactory.createForClass(
  CommitteeGroupAssignment,
);
