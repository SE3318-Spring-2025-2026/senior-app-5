import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import {
  Schedule,
  ScheduleDocument,
  SchedulePhase,
} from '../advisors/schemas/schedule.schema';
import { Role } from '../auth/enums/role.enum';
import {
  Committee,
  CommitteeDocument,
} from '../committees/schemas/committee.schema';
import {
  Submission,
  SubmissionDocument,
  SubmissionStatus,
} from '../submissions/schemas/submission.schema';
import { AddCommentDto } from './dto/add-comment.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateRevisionRequestDto } from './dto/create-revision-request.dto';
import {
  ReviewCommentResponseDto,
  ReviewResponseDto,
  RevisionRequestResponseDto,
  SubmitGradeResponseDto,
} from './dto/review-response.dto';
import { SubmitGradeDto } from './dto/submit-grade.dto';
import {
  Review,
  ReviewComment,
  ReviewDocument,
  ReviewStatus,
  RevisionRequest,
} from './schemas/review.schema';

export type ReviewActor = {
  userId?: string;
  role?: string;
  groupId?: string;
};

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Submission.name)
    private submissionModel: Model<SubmissionDocument>,
    @InjectModel(Committee.name)
    private committeeModel: Model<CommitteeDocument>,
    @InjectModel(Schedule.name) private scheduleModel: Model<ScheduleDocument>,
  ) {}

  private getJuryUserIds(committee: Pick<Committee, 'jury'>): string[] {
    return ((committee.jury as any[]) ?? [])
      .map((member) => member.userId ?? member.reviewerUserId ?? member.id)
      .filter(Boolean)
      .map(String);
  }

  private getCommitteeGroupIds(committee: Pick<Committee, 'groups'>): string[] {
    return ((committee.groups as any[]) ?? [])
      .map((group) => group.groupId ?? group.id)
      .filter(Boolean)
      .map(String);
  }

  private assertUser(actor: ReviewActor): string {
    if (!actor.userId) {
      throw new ForbiddenException('Authenticated user context is missing.');
    }
    return actor.userId;
  }

  private async findReviewOrThrow(reviewId: string): Promise<ReviewDocument> {
    const review = await this.reviewModel.findOne({ reviewId }).exec();
    if (!review) {
      throw new NotFoundException('Review not found.');
    }
    return review;
  }

  private toCommentResponse(comment: ReviewComment): ReviewCommentResponseDto {
    return {
      commentId: comment.commentId,
      text: comment.text,
      authorUserId: comment.authorUserId,
      createdAt: comment.createdAt,
    };
  }

  private toRevisionRequestResponse(
    revisionRequest: RevisionRequest,
  ): RevisionRequestResponseDto {
    return {
      revisionRequestId: revisionRequest.revisionRequestId,
      description: revisionRequest.description,
      dueDatetime: revisionRequest.dueDatetime,
      createdAt: revisionRequest.createdAt,
    };
  }

  private toReviewResponse(review: ReviewDocument): ReviewResponseDto {
    const timestamps = review as ReviewDocument & {
      createdAt?: Date;
      updatedAt?: Date;
    };

    return {
      reviewId: review.reviewId,
      submissionId: review.submissionId,
      committeeId: review.committeeId,
      reviewerUserId: review.reviewerUserId,
      grade: review.grade,
      status: review.status,
      comments: review.comments.map((comment) =>
        this.toCommentResponse(comment),
      ),
      revisionRequests: review.revisionRequests.map((revisionRequest) =>
        this.toRevisionRequestResponse(revisionRequest),
      ),
      createdAt: timestamps.createdAt,
      updatedAt: timestamps.updatedAt,
    };
  }

  private async findSubmissionOrThrow(
    submissionId: string,
  ): Promise<SubmissionDocument> {
    const submission = await this.submissionModel.findById(submissionId).exec();
    if (!submission) {
      throw new NotFoundException('Submission not found.');
    }
    return submission;
  }

  private async findCommitteeOrThrow(
    committeeId: string,
  ): Promise<CommitteeDocument> {
    const committee = await this.committeeModel
      .findOne({ id: committeeId })
      .exec();
    if (!committee) {
      throw new NotFoundException('Committee not found.');
    }
    return committee;
  }

  private assertCommitteeOwnsSubmission(
    committee: CommitteeDocument,
    submission: SubmissionDocument,
  ) {
    if (!this.getCommitteeGroupIds(committee).includes(String(submission.groupId))) {
      throw new ForbiddenException(
        'Submission does not belong to the requested committee.',
      );
    }
  }

  async assertProfessorCanAccessCommittee(
    committeeId: string,
    actor: ReviewActor,
  ): Promise<CommitteeDocument> {
    const userId = this.assertUser(actor);
    const committee = await this.findCommitteeOrThrow(committeeId);
    if (!this.getJuryUserIds(committee).includes(String(userId))) {
      throw new ForbiddenException('Caller is not in the committee jury.');
    }
    return committee;
  }

  async assertProfessorCanAccessSubmission(
    submission: SubmissionDocument,
    actor: ReviewActor,
  ): Promise<void> {
    if (actor.role !== Role.Professor) return;
    const userId = this.assertUser(actor);
    const committee = await this.committeeModel
      .findOne({ 'groups.groupId': submission.groupId, 'jury.userId': userId })
      .exec();
    if (!committee) {
      throw new ForbiddenException(
        'Submission is outside the calling professor committee.',
      );
    }
  }

  async createReview(
    dto: CreateReviewDto,
    actor: ReviewActor,
  ): Promise<ReviewResponseDto> {
    const reviewerUserId = this.assertUser(actor);
    const submission = await this.findSubmissionOrThrow(dto.submissionId);
    const committee = await this.findCommitteeOrThrow(dto.committeeId);
    this.assertCommitteeOwnsSubmission(committee, submission);

    if (!this.getJuryUserIds(committee).includes(String(reviewerUserId))) {
      throw new ForbiddenException('Caller is not in the committee jury.');
    }

    const existing = await this.reviewModel
      .findOne({ submissionId: dto.submissionId, reviewerUserId })
      .exec();
    if (existing) {
      throw new ConflictException(
        'Review already exists for this reviewer and submission.',
      );
    }

    const review = new this.reviewModel({
      submissionId: dto.submissionId,
      committeeId: dto.committeeId,
      reviewerUserId,
      grade: null,
      status: ReviewStatus.Draft,
      comments: [],
      revisionRequests: [],
    });
    const saved = await review.save();

    submission.status = SubmissionStatus.UnderReview;
    await submission.save();

    return this.toReviewResponse(saved);
  }

  async getReview(
    reviewId: string,
    actor: ReviewActor,
  ): Promise<ReviewResponseDto> {
    const review = await this.findReviewOrThrow(reviewId);
    const submission = await this.findSubmissionOrThrow(review.submissionId);

    if (actor.role === Role.Professor) {
      if (String(review.reviewerUserId) !== String(actor.userId)) {
        throw new ForbiddenException('Access denied.');
      }
      return this.toReviewResponse(review);
    }

    if (actor.role === Role.Student || actor.role === Role.TeamLeader) {
      if (String(submission.groupId) !== String(actor.groupId)) {
        throw new ForbiddenException('Access denied.');
      }
      return this.toReviewResponse(review);
    }

    if (actor.role === Role.Coordinator || actor.role === Role.Admin) {
      return this.toReviewResponse(review);
    }

    throw new ForbiddenException('Access denied.');
  }

  async addComment(
    reviewId: string,
    dto: AddCommentDto,
    actor: ReviewActor,
  ): Promise<ReviewCommentResponseDto> {
    const authorUserId = this.assertUser(actor);
    const review = await this.findReviewOrThrow(reviewId);
    if (String(review.reviewerUserId) !== String(authorUserId)) {
      throw new ForbiddenException('Caller does not own the review.');
    }

    const comment: ReviewComment = {
      commentId: randomUUID(),
      text: dto.text,
      authorUserId,
      createdAt: new Date(),
    };
    review.comments.push(comment);
    await review.save();
    return this.toCommentResponse(comment);
  }

  async deleteComment(
    reviewId: string,
    commentId: string,
    actor: ReviewActor,
  ): Promise<void> {
    const authorUserId = this.assertUser(actor);
    const review = await this.findReviewOrThrow(reviewId);
    const comment = review.comments.find(
      (item) => item.commentId === commentId,
    );
    if (!comment) {
      throw new NotFoundException('Comment not found.');
    }
    if (String(comment.authorUserId) !== String(authorUserId)) {
      throw new ForbiddenException('Caller is not the comment author.');
    }

    review.comments = review.comments.filter(
      (item) => item.commentId !== commentId,
    );
    await review.save();
  }

  async createRevisionRequest(
    reviewId: string,
    dto: CreateRevisionRequestDto,
    actor: ReviewActor,
  ): Promise<RevisionRequestResponseDto> {
    const reviewerUserId = this.assertUser(actor);
    const review = await this.findReviewOrThrow(reviewId);
    if (String(review.reviewerUserId) !== String(reviewerUserId)) {
      throw new ForbiddenException('Caller does not own the review.');
    }

    const revisionRequest: RevisionRequest = {
      revisionRequestId: randomUUID(),
      description: dto.description,
      dueDatetime: new Date(dto.dueDatetime),
      createdAt: new Date(),
    };
    review.revisionRequests.push(revisionRequest);
    await review.save();

    await this.submissionModel
      .updateOne(
        { _id: review.submissionId },
        { $set: { status: SubmissionStatus.NeedsRevision } },
      )
      .exec();

    return this.toRevisionRequestResponse(revisionRequest);
  }

  private async assertGradingWindowOpen() {
    const schedule = await this.scheduleModel
      .findOne({ phase: SchedulePhase.GRADING, isActive: true })
      .sort({ createdAt: -1 })
      .lean<{ startDatetime: Date; endDatetime: Date } | null>()
      .exec();
    const now = Date.now();
    const isOpen =
      schedule !== null &&
      now >= new Date(schedule.startDatetime).getTime() &&
      now <= new Date(schedule.endDatetime).getTime();

    if (!isOpen) {
      throw new HttpException('Grading schedule window is closed.', 423);
    }
  }

  async submitGrade(
    reviewId: string,
    dto: SubmitGradeDto,
    actor: ReviewActor,
  ): Promise<SubmitGradeResponseDto> {
    if (dto.grade < 0 || dto.grade > 100) {
      throw new UnprocessableEntityException('Grade must be between 0 and 100.');
    }

    const reviewerUserId = this.assertUser(actor);
    const review = await this.findReviewOrThrow(reviewId);
    if (String(review.reviewerUserId) !== String(reviewerUserId)) {
      throw new ForbiddenException('Caller does not own the review.');
    }
    if (review.status === ReviewStatus.Submitted) {
      throw new ConflictException('Grade already submitted.');
    }

    await this.assertGradingWindowOpen();

    review.grade = dto.grade;
    review.status = ReviewStatus.Submitted;
    const saved = await review.save();

    const committee = await this.findCommitteeOrThrow(review.committeeId);
    const juryUserIds = this.getJuryUserIds(committee);
    const submittedCount = await this.reviewModel
      .countDocuments({
        submissionId: review.submissionId,
        reviewerUserId: { $in: juryUserIds },
        status: ReviewStatus.Submitted,
      })
      .exec();

    if (juryUserIds.length > 0 && submittedCount === juryUserIds.length) {
      await this.submissionModel
        .updateOne(
          { _id: review.submissionId },
          { $set: { status: SubmissionStatus.Approved } },
        )
        .exec();
    }

    return {
      reviewId: saved.reviewId,
      grade: saved.grade,
      status: saved.status,
      updatedAt: (saved as any).updatedAt,
    };
  }
}
