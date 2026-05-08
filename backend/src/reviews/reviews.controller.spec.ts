import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AddCommentDto } from './dto/add-comment.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateRevisionRequestDto } from './dto/create-revision-request.dto';
import { SubmitGradeDto } from './dto/submit-grade.dto';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  const reviewsService = {
    createReview: jest.fn(),
    getReview: jest.fn(),
    addComment: jest.fn(),
    deleteComment: jest.fn(),
    createRevisionRequest: jest.fn(),
    submitGrade: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [{ provide: ReviewsService, useValue: reviewsService }],
    }).compile();

    controller = module.get<ReviewsController>(ReviewsController);
  });

  const req = { user: { userId: 'prof-1', role: 'Professor' } } as any;

  it('delegates review creation to service', async () => {
    const dto: CreateReviewDto = {
      submissionId: 'sub-1',
      committeeId: 'committee-1',
    };
    const review = { reviewId: 'review-1' };
    reviewsService.createReview.mockResolvedValue(review);

    await expect(controller.createReview(req, dto)).resolves.toEqual(review);
    expect(reviewsService.createReview).toHaveBeenCalledWith(dto, req.user);
  });

  it('delegates review retrieval to service', async () => {
    reviewsService.getReview.mockResolvedValue({ reviewId: 'review-1' });

    await controller.getReview(req, 'review-1');

    expect(reviewsService.getReview).toHaveBeenCalledWith('review-1', req.user);
  });

  it('delegates comment creation to service', async () => {
    const dto: AddCommentDto = { text: 'Nice work' };
    reviewsService.addComment.mockResolvedValue({ commentId: 'comment-1' });

    await controller.addComment(req, 'review-1', dto);

    expect(reviewsService.addComment).toHaveBeenCalledWith(
      'review-1',
      dto,
      req.user,
    );
  });

  it('delegates comment deletion to service', async () => {
    reviewsService.deleteComment.mockResolvedValue(undefined);

    await controller.deleteComment(req, 'review-1', 'comment-1');

    expect(reviewsService.deleteComment).toHaveBeenCalledWith(
      'review-1',
      'comment-1',
      req.user,
    );
  });

  it('delegates revision requests to service', async () => {
    const dto: CreateRevisionRequestDto = {
      description: 'Revise this',
      dueDatetime: '2026-06-01T12:00:00.000Z',
    };
    reviewsService.createRevisionRequest.mockResolvedValue({
      revisionRequestId: 'revision-1',
    });

    await controller.createRevisionRequest(req, 'review-1', dto);

    expect(reviewsService.createRevisionRequest).toHaveBeenCalledWith(
      'review-1',
      dto,
      req.user,
    );
  });

  it('delegates grade submission to service', async () => {
    const dto: SubmitGradeDto = { grade: 85 };
    reviewsService.submitGrade.mockResolvedValue({ reviewId: 'review-1' });

    await controller.submitGrade(req, 'review-1', dto);

    expect(reviewsService.submitGrade).toHaveBeenCalledWith(
      'review-1',
      dto,
      req.user,
    );
  });

  it('propagates forbidden errors from the service', async () => {
    reviewsService.submitGrade.mockRejectedValue(new ForbiddenException());

    await expect(
      controller.submitGrade(req, 'review-1', { grade: 85 }),
    ).rejects.toThrow(ForbiddenException);
  });
});
