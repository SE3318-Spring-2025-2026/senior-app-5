import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Submission extends Document {
  @Prop({ required: true })
  title!: string;

  @Prop({ default: 'Pending' })
  status!: string;

  //Array to hold metadata of documents
  @Prop([{
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }])
  documents!: Array<{
    originalName: string;
    mimeType: string;
    uploadedAt: Date;
  }>;
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);