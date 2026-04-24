import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';

export type CommitteeDocument = HydratedDocument<Committee>;

@Schema({ timestamps: true })
export class Committee {
  @Prop({ type: String, default: () => randomUUID() })
  id!: string;

  @Prop({ required: true, maxlength: 200 })
  name!: string;

  @Prop({ type: [Object], default: [] })
  jury!: object[];

  @Prop({ type: [Object], default: [] })
  advisors!: object[];

  @Prop({ type: [Object], default: [] })
  groups!: object[];
}

export const CommitteeSchema = SchemaFactory.createForClass(Committee);
