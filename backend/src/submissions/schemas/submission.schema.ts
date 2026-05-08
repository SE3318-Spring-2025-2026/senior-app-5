import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';

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

  @Prop([
    {
      commentId: { type: String, default: () => randomUUID() },
      commentText: { type: String, required: true, maxlength: 2000 },
      reviewerUserId: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
  ])
  comments?: Array<{
    commentId: string;
    commentText: string;
    reviewerUserId: string;
    createdAt: Date;
  }>;


  @Prop([
    {
      revisionRequestId: { type: String, default: () => randomUUID() },
      requesterUserId: { type: String, required: true },
      revisionDueDatetime: { type: Date, required: true },
      status: { type: String, default: 'PENDING' },
      createdAt: { type: Date, default: Date.now },
    },
  ])
  revisionRequests?: Array<{
    revisionRequestId: string;
    requesterUserId: string;
    revisionDueDatetime: Date;
    status: string;
    createdAt: Date;
  }>;
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);