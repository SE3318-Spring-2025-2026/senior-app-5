import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';

export type SubmissionDocument = HydratedDocument<Submission>;

export interface SubmissionComment {
  commentId: string;
  commentText: string;
  reviewerUserId: string;
  createdAt: Date;
}

export interface SubmissionRevisionRequest {
  revisionRequestId: string;
  requesterUserId: string;
  revisionDueDatetime: Date;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
}

export interface SubmissionDocument {
  submissionId: string;
  title: string;
  status: string;
  groupId: string;
  type: string;
  phaseId: string;
  submittedAt: Date;
  documents: Array<{
    name: string;
    url: string;
  }>;
  comments: SubmissionComment[];
  revisionRequests: SubmissionRevisionRequest[];
  createdAt?: Date;
  updatedAt?: Date;
}

@Schema({ timestamps: true })
export class Submission {
  @Prop({ type: String, default: () => randomUUID() })
  submissionId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ default: 'PENDING' })
  status!: string;

  @Prop({ required: true })
  groupId!: string;

  @Prop({ required: true })
  type!: string;

  @Prop({ required: true })
  phaseId!: string;

  @Prop({ type: Date, default: () => new Date() })
  submittedAt!: Date;

  @Prop({ type: [Object], default: [] })
  documents!: Array<{
    name: string;
    url: string;
  }>;

  @Prop(
    {
      type: [
        {
          commentId: { type: String, default: () => randomUUID() },
          commentText: { type: String, required: true, maxlength: 2000 },
          reviewerUserId: { type: String, required: true },
          createdAt: { type: Date, default: () => new Date() },
        },
      ],
      default: [],
    },
  )
  comments!: SubmissionComment[];

  @Prop(
    {
      type: [
        {
          revisionRequestId: { type: String, default: () => randomUUID() },
          requesterUserId: { type: String, required: true },
          revisionDueDatetime: { type: Date, required: true },
          status: {
            type: String,
            enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
            default: 'PENDING',
          },
          createdAt: { type: Date, default: () => new Date() },
        },
      ],
      default: [],
    },
  )
  revisionRequests!: SubmissionRevisionRequest[];
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);
