import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';

export type DeliverableDocument = HydratedDocument<Deliverable>;

@Schema({ timestamps: true })
export class Deliverable {
  @Prop({
    type: String,
    default: () => randomUUID(),
    unique: true,
    index: true,
  })
  deliverableId!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, default: null })
  description?: string | null;
}

export const DeliverableSchema = SchemaFactory.createForClass(Deliverable);
