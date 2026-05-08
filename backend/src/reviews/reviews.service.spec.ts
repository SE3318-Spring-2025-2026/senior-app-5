import {
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Schedule } from '../advisors/schemas/schedule.schema';
import { Committee } from '../committees/schemas/committee.schema';
import {
  Submission,
  SubmissionStatus,
} from '../submissions/schemas/submission.schema';
import { Review, ReviewStatus } from './schemas/review.schema';
import { ReviewsService } from './reviews.service';

const execResult = (value: unknown) => ({
  exec: jest.fn().mockResolvedValue(value),
});

const leanExecResult = (value: unknown) => ({
  exec: jest.fn().mockResolvedValue(value),
});

const scheduleQuery = (value: unknown) => ({
  sort: jest.fn().mockReturnValue({
    lean: jest.fn().mockReturnValue(leanExecResult(value)),
  }),
});

describe('ReviewsService', () => {
  let service: ReviewsService;
  const mockReviewSave = jest.fn();
  const mockReviewModel: any = jest.fn((payload) => ({
    ...payload,
    comments: payload.comments ?? [],
    revisionRequests: payload.revisionRequests ?? [],
    save: mockReviewSave,
  }));
  mockReviewModel.findOne = jest.fn();
  mockReviewModel.countDocuments = jest.fn();

  const mockSubmissionModel = {
    findById: jest.fn(),
    updateOne: jest.fn(),
  };
  const mockCommitteeModel = { findOne: jest.fn() };
  const mockScheduleModel = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockReviewModel.mockClear();
    mockReviewModel.findOne.mockReset();
    mockReviewModel.countDocuments.mockReset();
    mockSubmissionModel.findById.mockReset();
    mockSubmissionModel.updateOne.mockReset();
    mockCommitteeModel.findOne.mockReset();
    mockScheduleModel.findOne.mockReset();
    mockReviewSave.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getModelToken(Review.name), useValue: mockReviewModel },
        { provide: getModelToken(Submission.name), useValue: mockSubmissionModel },
        { provide: getModelToken(Committee.name), useValue: mockCommitteeModel },
        { provide: getModelToken(Schedule.name), useValue: mockScheduleModel },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  const submission = (overrides = {}) =>
    ({
      _id: 'sub-1',
      groupId: 'group-1',
      status: SubmissionStatus.Pending,
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    }) as any;

  const committee = (overrides = {}) =>
    ({
      id: 'committee-1',
      jury: [{ userId: 'prof-1' }, { userId: 'prof-2' }],
      groups: [{ groupId: 'group-1' }],
      ...overrides,
    }) as any;

  const review = (overrides = {}) =>
    ({
      reviewId: 'review-1',
      submissionId: 'sub-1',
      committeeId: 'committee-1',
      reviewerUserId: 'prof-1',
      grade: null,
      status: ReviewStatus.Draft,
      comments: [],
      revisionRequests: [],
      save: jest.fn().mockResolvedValue({ reviewId: 'review-1', ...overrides }),
      ...overrides,
    }) as any;

  it('creates a review and moves submission to UnderReview', async () => {
    const sub = submission();
    const savedReview = review();
    mockSubmissionModel.findById.mockReturnValue(execResult(sub));
    mockCommitteeModel.findOne.mockReturnValue(execResult(committee()));
    mockReviewModel.findOne.mockReturnValue(execResult(null));
    mockReviewSave.mockResolvedValue(savedReview);

    const result = await service.createReview(
      { submissionId: 'sub-1', committeeId: 'committee-1' },
      { userId: 'prof-1', role: 'Professor' },
    );

    expect(result).toMatchObject({
      reviewId: savedReview.reviewId,
      submissionId: savedReview.submissionId,
      committeeId: savedReview.committeeId,
      reviewerUserId: savedReview.reviewerUserId,
      grade: savedReview.grade,
      status: savedReview.status,
      comments: [],
      revisionRequests: [],
    });
    expect(result).not.toHaveProperty('save');
    expect(sub.status).toBe(SubmissionStatus.UnderReview);
    expect(sub.save).toHaveBeenCalled();
  });

  it('rejects duplicate reviews for the same reviewer and submission', async () => {
    mockSubmissionModel.findById.mockReturnValue(execResult(submission()));
    mockCommitteeModel.findOne.mockReturnValue(execResult(committee()));
    mockReviewModel.findOne.mockReturnValue(execResult(review()));

    await expect(
      service.createReview(
        { submissionId: 'sub-1', committeeId: 'committee-1' },
        { userId: 'prof-1' },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('adds a comment for the owning reviewer', async () => {
    const ownedReview = review();
    mockReviewModel.findOne.mockReturnValue(execResult(ownedReview));

    const result = await service.addComment(
      'review-1',
      { text: 'Looks good' },
      { userId: 'prof-1' },
    );

    expect(result.text).toBe('Looks good');
    expect(ownedReview.comments).toHaveLength(1);
    expect(ownedReview.save).toHaveBeenCalled();
  });

  it('deletes a comment only for the comment author', async () => {
    const ownedReview = review({
      comments: [
        {
          commentId: 'comment-1',
          text: 'Fix section 2',
          authorUserId: 'prof-1',
          createdAt: new Date(),
        },
      ],
    });
    mockReviewModel.findOne.mockReturnValue(execResult(ownedReview));

    await service.deleteComment('review-1', 'comment-1', { userId: 'prof-1' });

    expect(ownedReview.comments).toHaveLength(0);
    expect(ownedReview.save).toHaveBeenCalled();
  });

  it('creates a revision request and moves submission to NeedsRevision', async () => {
    const ownedReview = review();
    mockReviewModel.findOne.mockReturnValue(execResult(ownedReview));
    mockSubmissionModel.updateOne.mockReturnValue(execResult({ modifiedCount: 1 }));

    const result = await service.createRevisionRequest(
      'review-1',
      {
        description: 'Revise the proposal.',
        dueDatetime: '2026-06-01T12:00:00.000Z',
      },
      { userId: 'prof-1' },
    );

    expect(result.description).toBe('Revise the proposal.');
    expect(mockSubmissionModel.updateOne).toHaveBeenCalledWith(
      { _id: 'sub-1' },
      { $set: { status: SubmissionStatus.NeedsRevision } },
    );
  });

  it('submits a grade inside the grading window', async () => {
    const ownedReview = review({
      save: jest.fn().mockResolvedValue({
        reviewId: 'review-1',
        grade: 85,
        status: ReviewStatus.Submitted,
        updatedAt: new Date('2026-06-01T12:00:00.000Z'),
      }),
    });
    mockReviewModel.findOne.mockReturnValue(execResult(ownedReview));
    mockScheduleModel.findOne.mockReturnValue(
      scheduleQuery({
        startDatetime: new Date(Date.now() - 60_000),
        endDatetime: new Date(Date.now() + 60_000),
      }),
    );
    mockCommitteeModel.findOne.mockReturnValue(execResult(committee()));
    mockReviewModel.countDocuments.mockReturnValue(execResult(1));

    const result = await service.submitGrade(
      'review-1',
      { grade: 85 },
      { userId: 'prof-1' },
    );

    expect(result).toMatchObject({
      reviewId: 'review-1',
      grade: 85,
      status: ReviewStatus.Submitted,
    });
    expect(ownedReview.save).toHaveBeenCalled();
  });

  it('returns 423 when grading window is closed', async () => {
    mockReviewModel.findOne.mockReturnValue(execResult(review()));
    mockScheduleModel.findOne.mockReturnValue(scheduleQuery(null));

    await expect(
      service.submitGrade('review-1', { grade: 85 }, { userId: 'prof-1' }),
    ).rejects.toMatchObject({ status: 423 });
  });

  it('rejects out of range grades with 422', async () => {
    await expect(
      service.submitGrade('review-1', { grade: 101 }, { userId: 'prof-1' }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('auto-approves submission when all jury members have submitted grades', async () => {
    const ownedReview = review({
      save: jest.fn().mockResolvedValue({
        reviewId: 'review-1',
        grade: 90,
        status: ReviewStatus.Submitted,
      }),
    });
    mockReviewModel.findOne.mockReturnValue(execResult(ownedReview));
    mockScheduleModel.findOne.mockReturnValue(
      scheduleQuery({
        startDatetime: new Date(Date.now() - 60_000),
        endDatetime: new Date(Date.now() + 60_000),
      }),
    );
    mockCommitteeModel.findOne.mockReturnValue(execResult(committee()));
    mockReviewModel.countDocuments.mockReturnValue(execResult(2));
    mockSubmissionModel.updateOne.mockReturnValue(execResult({ modifiedCount: 1 }));

    await service.submitGrade('review-1', { grade: 90 }, { userId: 'prof-1' });

    expect(mockSubmissionModel.updateOne).toHaveBeenCalledWith(
      { _id: 'sub-1' },
      { $set: { status: SubmissionStatus.Approved } },
    );
  });

  it('rejects access to another professor review', async () => {
    mockReviewModel.findOne.mockReturnValue(execResult(review()));
    mockSubmissionModel.findById.mockReturnValue(execResult(submission()));

    await expect(
      service.getReview('review-1', { role: 'Professor', userId: 'prof-2' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws not found for a missing review', async () => {
    mockReviewModel.findOne.mockReturnValue(execResult(null));

    await expect(service.getReview('missing', { role: 'Admin' })).rejects.toThrow(
      NotFoundException,
    );
  });
});
