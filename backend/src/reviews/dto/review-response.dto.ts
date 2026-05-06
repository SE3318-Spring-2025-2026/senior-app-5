import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewStatus } from '../schemas/review.schema';

export class ReviewCommentResponseDto {
  @ApiProperty({ format: 'uuid' })
  commentId!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty()
  authorUserId!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}

export class RevisionRequestResponseDto {
  @ApiProperty({ format: 'uuid' })
  revisionRequestId!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ format: 'date-time' })
  dueDatetime!: Date;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}

export class ReviewResponseDto {
  @ApiProperty({ format: 'uuid' })
  reviewId!: string;

  @ApiProperty({ description: 'MongoDB ObjectId of the reviewed submission' })
  submissionId!: string;

  @ApiProperty({ format: 'uuid' })
  committeeId!: string;

  @ApiProperty()
  reviewerUserId!: string;

  @ApiProperty({ type: Number, nullable: true, minimum: 0, maximum: 100 })
  grade!: number | null;

  @ApiProperty({ enum: ReviewStatus })
  status!: ReviewStatus;

  @ApiProperty({ type: [ReviewCommentResponseDto] })
  comments!: ReviewCommentResponseDto[];

  @ApiProperty({ type: [RevisionRequestResponseDto] })
  revisionRequests!: RevisionRequestResponseDto[];

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  createdAt?: Date;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  updatedAt?: Date;
}

export class SubmitGradeResponseDto {
  @ApiProperty({ format: 'uuid' })
  reviewId!: string;

  @ApiProperty({ type: Number, nullable: true, minimum: 0, maximum: 100 })
  grade!: number | null;

  @ApiProperty({ enum: ReviewStatus })
  status!: ReviewStatus;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  updatedAt?: Date;
}
