import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export class JuryMember {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  assignedAt: Date;
}

const JuryMemberSchema = SchemaFactory.createForClass(JuryMember);

export type CommitteeDocument = Committee & Document;

@Schema({ timestamps: true })
export class Committee {
  @Prop({ required: true, unique: true, index: true })
  committeeId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: [JuryMemberSchema], default: [] })
  juryMembers: JuryMember[];
}

export const CommitteeSchema = SchemaFactory.createForClass(Committee);