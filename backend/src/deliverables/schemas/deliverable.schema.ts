import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DeliverableDocument = HydratedDocument<Deliverable>;

@Schema({ timestamps: true })
export class Deliverable {
  @Prop({ type: String, default: () => randomUUID(), unique: true })
  deliverableId!: string;

  @Prop({ type: String, required: true, unique: true, trim: true })
  name!: string;

  @Prop({ type: Number, required: true, min: 0, max: 1 })
  categoryWeight!: number;

  @Prop({ type: Number, required: true, min: 0, max: 1 })
  subWeight!: number;

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  deliverablePercentage!: number;
}

export const DeliverableSchema = SchemaFactory.createForClass(Deliverable);
