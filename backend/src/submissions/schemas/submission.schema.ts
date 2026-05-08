import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SubmissionDocument = HydratedDocument<Submission>;

export enum SubmissionStatus {
  Pending = 'Pending',
  UnderReview = 'UnderReview',
  NeedsRevision = 'NeedsRevision',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

@Schema({ timestamps: true })
export class Submission {
  @Prop({ required: true })
  title!: string;

  @Prop({
    type: String,
    enum: Object.values(SubmissionStatus),
    default: SubmissionStatus.Pending,
  })
  status!: SubmissionStatus;

  @Prop({ required: true })
  groupId!: string;

  @Prop({ required: true })
  type!: string;

  @Prop({ required: true })
  phaseId!: string;

  @Prop({ type: Date, required: true })
  submittedAt!: Date;

  //Array to hold metadata of documents
  @Prop([
    {
      originalName: { type: String, required: true },
      mimeType: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
      storagePath: { type: String, required: false },
    },
  ])
  documents?: Array<{
    originalName: string;
    mimeType: string;
    uploadedAt: Date;
    storagePath?: string;
  }>;
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);
