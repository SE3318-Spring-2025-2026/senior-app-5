import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SubmissionDocument = HydratedDocument<Submission>;

@Schema({ timestamps: true })
export class Submission {
  @Prop({ required: true })
  title!: string;

  @Prop({ default: 'Pending' })
  status!: string;

  @Prop({ required: true })
  groupId!: string;

  @Prop({ required: true })
  type!: string;

  @Prop({ required: true })
  phaseId!: string;

  @Prop({ type: Date, required: true })
  submittedAt!: Date;

  @Prop([{
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  }])
  documents?: Array<{
    originalName: string;
    mimeType: string;
    uploadedAt: Date;
  }>;
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);
