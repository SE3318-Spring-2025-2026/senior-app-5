import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';

export type CommitteeDocument = HydratedDocument<Committee>;

export interface JuryMember {
  userId: string;
  name?: string;
  [key: string]: any;
}

export interface CommitteeGroup {
  groupId: string;
  assignedAt?: Date;
  assignedByUserId?: string;
  [key: string]: any;
}


@Schema({ timestamps: true })
export class Committee {
  @Prop({ type: String, default: () => randomUUID() })
  id!: string;

  @Prop({ required: true, maxlength: 200 })
  name!: string;

  @Prop({ type: [Object], default: [] })
  jury!: JuryMember[];

  @Prop({ type: [Object], default: [] })
  advisors!: object[];

  @Prop({ type: [Object], default: [] })
  groups!: CommitteeGroup[];
}

export const CommitteeSchema = SchemaFactory.createForClass(Committee);
