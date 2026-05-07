import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';

export type PhaseDocument = HydratedDocument<Phase>;

@Schema({ timestamps: true })
export class Phase {
  @Prop({ type: String, default: () => randomUUID(), unique: true })
  phaseId!: string;

  @Prop({ type: String, trim: true, default: '' })
  name!: string;

  @Prop({ type: Date })
  submissionStart?: Date;

  @Prop({ type: Date })
  submissionEnd?: Date;

  @Prop({ type: [String], default: [] })
  requiredFields!: string[];
}

export const PhaseSchema = SchemaFactory.createForClass(Phase);
