import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { Submission } from './schemas/submission.schema';
import { Committee } from '../committees/schemas/committee.schema';

describe('SubmissionsService', () => {
  let service: SubmissionsService;

  const mockSubmissionModel = {
    findOne: jest.fn(),
  };

  const mockCommitteeModel = {
    findOne: jest.fn(),
  };

  const testSubmissionId = 'submission-1';
  const testGroupId = 'group-1';
  const testCommitteeId = 'committee-1';
  const testUserId = 'prof-1';
  const otherUserId = 'prof-2';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        {
          provide: getModelToken(Submission.name),
          useValue: mockSubmissionModel,
        },
        {
          provide: getModelToken(Committee.name),
          useValue: mockCommitteeModel,
        },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
  });

  describe('addComment', () => {
    it('should add a comment successfully when user is a jury member', async () => {
      const mockSubmission = {
        submissionId: testSubmissionId,
        groupId: testGroupId,
        comments: [],
        save: jest.fn().mockResolvedValue({
          submissionId: testSubmissionId,
          groupId: testGroupId,
          comments: [
            {
              commentId: expect.any(String),
              commentText: 'Test comment',
              reviewerUserId: testUserId,
              createdAt: expect.any(Date),
            },
          ],
        }),
      };

      const mockCommittee = {
        id: testCommitteeId,
        jury: [{ userId: testUserId, name: 'Prof One' }],
      };

      mockSubmissionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSubmission),
      });

      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCommittee),
      });

      const result = await service.addComment(testUserId, testSubmissionId, {
        commentText: 'Test comment',
      });

      expect(result).toMatchObject({
        commentText: 'Test comment',
        reviewerUserId: testUserId,
      });
      expect(result.commentId).toBeDefined();
      expect(mockSubmission.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not a jury member', async () => {
      const mockSubmission = {
        submissionId: testSubmissionId,
        groupId: testGroupId,
      };

      const mockCommittee = {
        id: testCommitteeId,
        jury: [{ userId: otherUserId, name: 'Prof Two' }],
      };

      mockSubmissionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSubmission),
      });

      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCommittee),
      });

      await expect(
        service.addComment(testUserId, testSubmissionId, {
          commentText: 'Test comment',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when submission does not exist', async () => {
      mockSubmissionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.addComment(testUserId, testSubmissionId, {
          commentText: 'Test comment',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listComments', () => {
    it('should list all comments for a submission', async () => {
      const mockComments = [
        {
          commentId: 'comment-1',
          commentText: 'First comment',
          reviewerUserId: testUserId,
          createdAt: new Date(),
        },
        {
          commentId: 'comment-2',
          commentText: 'Second comment',
          reviewerUserId: testUserId,
          createdAt: new Date(),
        },
      ];

      const mockSubmission = {
        submissionId: testSubmissionId,
        groupId: testGroupId,
        comments: mockComments,
      };

      const mockCommittee = {
        id: testCommitteeId,
        jury: [{ userId: testUserId, name: 'Prof One' }],
      };

      mockSubmissionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSubmission),
      });

      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCommittee),
      });

      const result = await service.listComments(testUserId, testSubmissionId);

      expect(result).toHaveLength(2);
      expect(result[0].commentText).toBe('First comment');
      expect(result[1].commentText).toBe('Second comment');
    });

    it('should throw ForbiddenException when user is not a jury member', async () => {
      const mockSubmission = {
        submissionId: testSubmissionId,
        groupId: testGroupId,
      };

      const mockCommittee = {
        id: testCommitteeId,
        jury: [{ userId: otherUserId, name: 'Prof Two' }],
      };

      mockSubmissionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSubmission),
      });

      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCommittee),
      });

      await expect(
        service.listComments(testUserId, testSubmissionId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createRevisionRequest', () => {
    it('should create a revision request with a future due date', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      const mockSubmission = {
        submissionId: testSubmissionId,
        groupId: testGroupId,
        revisionRequests: [],
        save: jest.fn().mockResolvedValue({
          submissionId: testSubmissionId,
          groupId: testGroupId,
          revisionRequests: [
            {
              revisionRequestId: expect.any(String),
              requesterUserId: testUserId,
              revisionDueDatetime: futureDate,
              status: 'PENDING',
              createdAt: expect.any(Date),
            },
          ],
        }),
      };

      const mockCommittee = {
        id: testCommitteeId,
        jury: [{ userId: testUserId, name: 'Prof One' }],
      };

      mockSubmissionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSubmission),
      });

      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCommittee),
      });

      const result = await service.createRevisionRequest(
        testUserId,
        testSubmissionId,
        {
          revisionDueDatetime: futureDate.toISOString(),
        },
      );

      expect(result).toMatchObject({
        requesterUserId: testUserId,
        status: 'PENDING',
      });
      expect(result.revisionRequestId).toBeDefined();
      expect(result.revisionDueDatetime).toEqual(futureDate);
      expect(mockSubmission.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when due date is in the past', async () => {
      const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // Yesterday

      const mockSubmission = {
        submissionId: testSubmissionId,
        groupId: testGroupId,
      };

      const mockCommittee = {
        id: testCommitteeId,
        jury: [{ userId: testUserId, name: 'Prof One' }],
      };

      mockSubmissionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSubmission),
      });

      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCommittee),
      });

      await expect(
        service.createRevisionRequest(testUserId, testSubmissionId, {
          revisionDueDatetime: pastDate.toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user is not a jury member', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const mockSubmission = {
        submissionId: testSubmissionId,
        groupId: testGroupId,
      };

      const mockCommittee = {
        id: testCommitteeId,
        jury: [{ userId: otherUserId, name: 'Prof Two' }],
      };

      mockSubmissionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSubmission),
      });

      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCommittee),
      });

      await expect(
        service.createRevisionRequest(testUserId, testSubmissionId, {
          revisionDueDatetime: futureDate.toISOString(),
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when submission does not exist', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      mockSubmissionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.createRevisionRequest(testUserId, testSubmissionId, {
          revisionDueDatetime: futureDate.toISOString(),
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSubmissionById', () => {
    it('should return a submission by ID', async () => {
      const mockSubmission = {
        submissionId: testSubmissionId,
        groupId: testGroupId,
        title: 'Test Submission',
      };

      mockSubmissionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSubmission),
      });

      const result = await service.getSubmissionById(testSubmissionId);

      expect(result).toMatchObject({
        submissionId: testSubmissionId,
        groupId: testGroupId,
        title: 'Test Submission',
      });
    });

    it('should return null when submission does not exist', async () => {
      mockSubmissionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getSubmissionById(testSubmissionId);

      expect(result).toBeNull();
    });
  });
});
