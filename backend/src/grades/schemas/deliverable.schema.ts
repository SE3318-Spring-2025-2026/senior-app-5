import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DeliverableDocument = HydratedDocument<Deliverable>;

@Schema({ timestamps: true })
export class Deliverable {
  @Prop({ type: String, default: () => randomUUID(), unique: true })
  deliverableId!: string;

  @Prop({ type: String, required: true, unique: true })
  name!: string;

  /** Weight of the category this deliverable belongs to (e.g. 0.5 for Documents 50%). */
  @Prop({ type: Number, required: true, min: 0, max: 1 })
  categoryWeight!: number;

  /** Weight of this deliverable within its category (e.g. 0.35 for SoW within Documents). */
  @Prop({ type: Number, required: true, min: 0, max: 1 })
  subWeight!: number;

  /** Overall percentage contribution of this deliverable to the final grade (0–100). */
  @Prop({ type: Number, required: true, min: 0, max: 100 })
  deliverablePercentage!: number;
}

export const DeliverableSchema = SchemaFactory.createForClass(Deliverable);
