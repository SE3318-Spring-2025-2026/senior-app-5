import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { HydratedDocument } from 'mongoose';

export type PhaseDocument = HydratedDocument<Phase>;

@Schema({ timestamps: true })
export class Phase {
  @Prop({ type: String, default: () => randomUUID(), unique: true })
  phaseId: string;

  @Prop({ type: Date })
  submissionStart?: Date;

  @Prop({ type: Date })
  submissionEnd?: Date;
}

export const PhaseSchema = SchemaFactory.createForClass(Phase);
