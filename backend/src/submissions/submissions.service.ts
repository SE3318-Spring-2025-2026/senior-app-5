import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import {
  Submission,
  SubmissionDocument,
  SubmissionComment,
  SubmissionRevisionRequest,
} from './schemas/submission.schema';
import { Committee, CommitteeDocument } from '../committees/schemas/committee.schema';
import { AddCommentDto } from './dto/add-comment.dto';
import { CreateRevisionRequestDto } from './dto/create-revision-request.dto';
import { CommentResponseDto } from './dto/comment-response.dto';
import { RevisionRequestResponseDto } from './dto/revision-request-response.dto';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<SubmissionDocument>,
    @InjectModel(Committee.name)
    private readonly committeeModel: Model<CommitteeDocument>,
  ) {}

  /**
   * Asserts that a user is a jury member for a submission's group.
   * Throws ForbiddenException if not a jury member.
   * Returns the committee document if authorized.
   */
  private async assertJuryMember(
    submissionId: string,
    reviewerUserId: string,
  ): Promise<CommitteeDocument> {
    // Find the submission
    const submission = await this.submissionModel.findOne({ submissionId }).exec();
    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }

    // Find the committee that has this group
    const committee = await this.committeeModel.findOne({
      'groups.groupId': submission.groupId,
    }).exec();

    if (!committee) {
      throw new NotFoundException(
        `Committee not found for group ${submission.groupId}`,
      );
    }

    // Check if reviewer is a jury member
    const isJuryMember = (committee.jury as any[]).some(
      (j) => j.userId === reviewerUserId,
    );

    if (!isJuryMember) {
      throw new ForbiddenException(
        'You must be a jury member to access this submission',
      );
    }

    return committee;
  }

  /**
   * Add a comment to a submission.
   * Requires user to be a jury member of the submission's committee.
   */
  async addComment(
    reviewerUserId: string,
    submissionId: string,
    dto: AddCommentDto,
  ): Promise<CommentResponseDto> {
    // Verify jury membership
    await this.assertJuryMember(submissionId, reviewerUserId);

    // Find the submission
    const submission = await this.submissionModel.findOne({ submissionId }).exec();
    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }

    // Create the comment
    const comment: SubmissionComment = {
      commentId: randomUUID(),
      commentText: dto.commentText,
      reviewerUserId,
      createdAt: new Date(),
    };

    // Push comment to the submission
    submission.comments.push(comment);
    await submission.save();

    this.logger.log({
      event: 'comment_added',
      submissionId,
      commentId: comment.commentId,
      reviewerUserId,
    });

    return this.toCommentResponse(comment);
  }

  /**
   * List all comments for a submission.
   * Requires user to be a jury member of the submission's committee.
   */
  async listComments(
    reviewerUserId: string,
    submissionId: string,
  ): Promise<CommentResponseDto[]> {
    // Verify jury membership
    await this.assertJuryMember(submissionId, reviewerUserId);

    // Find the submission
    const submission = await this.submissionModel.findOne({ submissionId }).exec();
    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }

    return submission.comments.map((c) => this.toCommentResponse(c));
  }

  /**
   * Create a revision request for a submission.
   * Requires user to be a jury member and revisionDueDatetime must be in the future.
   */
  async createRevisionRequest(
    reviewerUserId: string,
    submissionId: string,
    dto: CreateRevisionRequestDto,
  ): Promise<RevisionRequestResponseDto> {
    // Verify jury membership
    await this.assertJuryMember(submissionId, reviewerUserId);

    // Parse and validate the due datetime
    const revisionDue = new Date(dto.revisionDueDatetime);
    const now = new Date();

    if (revisionDue <= now) {
      throw new BadRequestException(
        'revisionDueDatetime must be in the future',
      );
    }

    // Find the submission
    const submission = await this.submissionModel.findOne({ submissionId }).exec();
    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }

    // Create the revision request
    const revisionRequest: SubmissionRevisionRequest = {
      revisionRequestId: randomUUID(),
      requesterUserId: reviewerUserId,
      revisionDueDatetime: revisionDue,
      status: 'PENDING',
      createdAt: new Date(),
    };

    // Push revision request to the submission
    submission.revisionRequests.push(revisionRequest);
    await submission.save();

    this.logger.log({
      event: 'revision_request_created',
      submissionId,
      revisionRequestId: revisionRequest.revisionRequestId,
      requesterUserId: reviewerUserId,
      dueDateTime: revisionDue,
    });

    return this.toRevisionRequestResponse(revisionRequest);
  }

  /**
   * Get a submission by ID (internal use).
   */
  async getSubmissionById(submissionId: string): Promise<SubmissionDocument | null> {
    return this.submissionModel.findOne({ submissionId }).exec();
  }

  // Helper methods to convert domain models to DTOs
  private toCommentResponse(comment: SubmissionComment): CommentResponseDto {
    return {
      commentId: comment.commentId,
      commentText: comment.commentText,
      reviewerUserId: comment.reviewerUserId,
      createdAt: comment.createdAt,
    };
  }

  private toRevisionRequestResponse(
    revisionRequest: SubmissionRevisionRequest,
  ): RevisionRequestResponseDto {
    return {
      revisionRequestId: revisionRequest.revisionRequestId,
      requesterUserId: revisionRequest.requesterUserId,
      revisionDueDatetime: revisionRequest.revisionDueDatetime,
      status: revisionRequest.status,
      createdAt: revisionRequest.createdAt,
    };
  }
}
