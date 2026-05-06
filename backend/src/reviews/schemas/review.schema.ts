import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReviewDocument = HydratedDocument<Review>;

export enum ReviewStatus {
  Draft = 'Draft',
  Submitted = 'Submitted',
}

export type ReviewComment = {
  commentId: string;
  text: string;
  authorUserId: string;
  createdAt: Date;
};

export type RevisionRequest = {
  revisionRequestId: string;
  description: string;
  dueDatetime: Date;
  createdAt: Date;
};

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: String, default: () => randomUUID(), unique: true })
  reviewId!: string;

  @Prop({ type: String, required: true })
  submissionId!: string;

  @Prop({ type: String, required: true })
  committeeId!: string;

  @Prop({ type: String, required: true })
  reviewerUserId!: string;

  @Prop({ type: Number, default: null })
  grade!: number | null;

  @Prop({
    type: String,
    enum: Object.values(ReviewStatus),
    default: ReviewStatus.Draft,
  })
  status!: ReviewStatus;

  @Prop({
    type: [
      {
        commentId: { type: String, default: () => randomUUID() },
        text: { type: String, required: true, maxlength: 2000 },
        authorUserId: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  comments!: ReviewComment[];

  @Prop({
    type: [
      {
        revisionRequestId: { type: String, default: () => randomUUID() },
        description: { type: String, required: true },
        dueDatetime: { type: Date, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  revisionRequests!: RevisionRequest[];
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
ReviewSchema.index(
  { submissionId: 1, reviewerUserId: 1 },
  { unique: true },
);
ReviewSchema.index({ reviewId: 1 }, { unique: true });
