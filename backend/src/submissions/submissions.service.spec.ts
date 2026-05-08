import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Committee } from '../committees/schemas/committee.schema';
import { Role } from '../auth/enums/role.enum';
import { Group, GroupStatus } from '../groups/group.entity';
import { PhasesService } from '../phases/phases.service';
import { User } from '../users/data/user.schema';
import {
  MAX_DOCUMENTS_PER_SUBMISSION,
  SubmissionsService,
} from './submissions.service';
import { Submission } from './schemas/submission.schema';

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('file-content')),
}));

const execResult = (value: unknown) => ({
  exec: jest.fn().mockResolvedValue(value),
});

const chainFind = (value: unknown) => ({
  sort: jest.fn().mockReturnValue(execResult(value)),
});

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let phasesService: { findByPhaseId: jest.Mock; getPhaseById: jest.Mock };

  const validId = '507f1f77bcf86cd799439011';
  const otherValidId = '507f1f77bcf86cd799439012';
  const mockSave = jest.fn();
  const mockFindById = jest.fn();

  const mockSubmissionModel: any = jest
    .fn()
    .mockImplementation((payload: Record<string, unknown>) => ({
      ...payload,
      save: mockSave,
    }));

  mockSubmissionModel.findById = mockFindById;
  mockSubmissionModel.find = jest.fn();
  mockSubmissionModel.findOne = jest.fn();
  mockSubmissionModel.sort = jest.fn().mockReturnThis();
  mockSubmissionModel.exec = jest.fn();

  const mockGroupModel = { findOne: jest.fn() };
  const mockUserModel = { findById: jest.fn() };
  const mockCommitteeModel = { findOne: jest.fn() };

  const oneHour = 60 * 60 * 1000;
  const mockFile = {
    originalname: 'test-document.pdf',
    mimetype: 'application/pdf',
    buffer: Buffer.from('test content'),
    size: 1024,
  } as Express.Multer.File;

  const openPhase = () => ({
    submissionStart: new Date(Date.now() - oneHour),
    submissionEnd: new Date(Date.now() + oneHour),
  });

  const makeSubmission = (overrides = {}) => {
    const submission: any = {
      _id: validId,
      title: 'Test Proposal',
      groupId: 'group-1',
      type: 'INITIAL',
      phaseId: 'phase-1',
      documents: [],
      comments: [],
      revisionRequests: [],
      save: mockSave,
      ...overrides,
    };

    submission.get = jest.fn((field: string) => submission[field]);

    return submission;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSave.mockReset();
    mockSubmissionModel.mockClear();
    mockFindById.mockReset();
    mockSubmissionModel.find.mockReset();
    mockSubmissionModel.findOne.mockReset();
    mockSubmissionModel.sort.mockReset();
    mockSubmissionModel.exec.mockReset();
    mockGroupModel.findOne.mockReset();
    mockUserModel.findById.mockReset();
    mockCommitteeModel.findOne.mockReset();

    phasesService = {
      findByPhaseId: jest.fn(),
      getPhaseById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        { provide: getModelToken(Submission.name), useValue: mockSubmissionModel },
        { provide: getModelToken(Group.name), useValue: mockGroupModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Committee.name), useValue: mockCommitteeModel },
        { provide: PhasesService, useValue: phasesService },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSubmission', () => {
    it('should save submission when request time is within configured window', async () => {
      const savedSubmission = {
        _id: validId,
        title: 'Proposal',
        groupId: 'group-1',
        type: 'INITIAL',
        phaseId: 'phase-1',
        status: 'Pending',
      };

      phasesService.findByPhaseId.mockResolvedValue(openPhase());
      mockSave.mockResolvedValue(savedSubmission);

      const result = await service.createSubmission({
        title: 'Proposal',
        groupId: 'group-1',
        type: 'INITIAL',
        phaseId: 'phase-1',
      });

      expect(mockSubmissionModel).toHaveBeenCalledTimes(1);
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result).toEqual(savedSubmission);
    });

    it('rejects submissions outside the configured window', async () => {
      const now = new Date();

      phasesService.findByPhaseId.mockResolvedValue({
        phaseId: 'phase-1',
        submissionStart: new Date(now.getTime() - 120_000),
        submissionEnd: new Date(now.getTime() - 60_000),
      });

      await expect(
        service.createSubmission({
          title: 'Proposal',
          groupId: 'group-1',
          type: 'INITIAL',
          phaseId: 'phase-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return a submission for a valid ObjectId when found', async () => {
      const mockSubmission = { _id: validId, title: 'Test Proposal' };
      mockFindById.mockReturnValue(execResult(mockSubmission));

      const result = await service.findOne(validId);

      expect(mockFindById).toHaveBeenCalledWith(validId);
      expect(result).toEqual(mockSubmission);
    });

    it('should throw BadRequestException for invalid ObjectId format', async () => {
      await expect(service.findOne('not-an-objectid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findById', () => {
    it('should return submission when found with a valid ObjectId', async () => {
      const submission = { _id: validId, title: 'Test' };
      mockFindById.mockReturnValue(execResult(submission));

      const result = await service.findById(validId);

      expect(mockFindById).toHaveBeenCalledWith(validId);
      expect(result).toEqual(submission);
    });

    it('should throw NotFoundException when valid ObjectId is not found', async () => {
      mockFindById.mockReturnValue(execResult(null));

      await expect(service.findById(otherValidId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid ObjectId format', async () => {
      await expect(service.findById('submission-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('filters by groupId when provided', async () => {
      mockSubmissionModel.find.mockReturnValue(chainFind([]));

      await service.findAll('group-1');

      expect(mockSubmissionModel.find).toHaveBeenCalledWith({ groupId: 'group-1' });
    });

    it('filters by committee group IDs when provided', async () => {
      mockSubmissionModel.find.mockReturnValue(chainFind([]));

      await service.findAll(undefined, ['group-1', 'group-2']);

      expect(mockSubmissionModel.find).toHaveBeenCalledWith({
        groupId: { $in: ['group-1', 'group-2'] },
      });
    });
  });

  describe('committee access helpers', () => {
    it('returns committee group IDs for a jury professor', async () => {
      mockCommitteeModel.findOne.mockReturnValue(
        execResult({
          id: 'committee-1',
          jury: [{ userId: 'prof-1' }],
          groups: [{ groupId: 'group-1' }],
        }),
      );

      await expect(
        service.getCommitteeSubmissionGroupIds('committee-1', 'prof-1'),
      ).resolves.toEqual(['group-1']);
    });

    it('rejects committee filtering when professor is not in jury', async () => {
      mockCommitteeModel.findOne.mockReturnValue(
        execResult({ id: 'committee-1', jury: [], groups: [] }),
      );

      await expect(
        service.getCommitteeSubmissionGroupIds('committee-1', 'prof-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects professor submission access outside their committee', async () => {
      mockCommitteeModel.findOne.mockReturnValue(execResult(null));

      await expect(
        service.assertProfessorCanAccessSubmission(
          { groupId: 'group-1' } as any,
          'prof-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getCompleteness', () => {
    it('should return completeness when all required fields are present', async () => {
      const submission = makeSubmission({
        documents: [
          {
            originalName: 'doc.pdf',
            mimeType: 'application/pdf',
            uploadedAt: new Date(),
          },
        ],
      });

      mockFindById.mockReturnValue(execResult(submission));
      phasesService.findByPhaseId.mockResolvedValue({
        phaseId: 'phase-1',
        requiredFields: ['title', 'documents'],
      });

      const result = await service.getCompleteness(validId);

      expect(result).toEqual({
        submissionId: validId,
        isComplete: true,
        missingFields: [],
        requiredFields: ['title', 'documents'],
        phaseId: 'phase-1',
      });
    });

    it('should return incompleteness when required fields are missing', async () => {
      const submission = makeSubmission({
        _id: otherValidId,
        title: '',
        documents: [],
      });

      mockFindById.mockReturnValue(execResult(submission));
      phasesService.findByPhaseId.mockResolvedValue({
        phaseId: 'phase-1',
        requiredFields: ['title', 'documents'],
      });

      const result = await service.getCompleteness(otherValidId);

      expect(result).toEqual({
        submissionId: otherValidId,
        isComplete: false,
        missingFields: ['title', 'documents'],
        requiredFields: ['title', 'documents'],
        phaseId: 'phase-1',
      });
    });
  });

  describe('assertAuthorizedGroupMember', () => {
    it('should allow admin users without membership lookup', async () => {
      await expect(
        service.assertAuthorizedGroupMember(
          { userId: 'admin-id', role: Role.Admin },
          'group-1',
        ),
      ).resolves.toBeUndefined();

      expect(mockGroupModel.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when group does not exist', async () => {
      mockGroupModel.findOne.mockReturnValue(execResult(null));

      await expect(
        service.assertAuthorizedGroupMember(
          { userId: 'student-id', role: Role.Student },
          'missing-group',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when group is not active', async () => {
      mockGroupModel.findOne.mockReturnValue(
        execResult({ groupId: 'group-1', status: GroupStatus.DISBANDED }),
      );

      await expect(
        service.assertAuthorizedGroupMember(
          { userId: 'student-id', role: Role.Student },
          'group-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('uploadDocument', () => {
    it('should add document metadata to submission on valid upload', async () => {
      const submission = makeSubmission();

      mockFindById.mockReturnValue(execResult(submission));
      phasesService.getPhaseById.mockResolvedValue(openPhase());
      mockSave.mockResolvedValue(submission);

      const result = await service.uploadDocument(validId, mockFile);

      expect(result.message).toBe('Document uploaded successfully.');
      expect(submission.documents).toHaveLength(1);
      expect(submission.documents[0].originalName).toBe('test-document.pdf');
      expect(submission.documents[0].mimeType).toBe('application/pdf');
      expect(submission.documents[0].uploadedAt).toBeInstanceOf(Date);
      expect(submission.documents[0].storagePath).toContain(validId);
    });

    it('should persist document by calling save once', async () => {
      const submission = makeSubmission();

      mockFindById.mockReturnValue(execResult(submission));
      phasesService.getPhaseById.mockResolvedValue(openPhase());
      mockSave.mockResolvedValue(submission);

      await service.uploadDocument(validId, mockFile);

      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should decode latin1-encoded filename to UTF-8', async () => {
      const latin1EncodedName = Buffer.from('test.pdf', 'utf8').toString('latin1');
      const submission = makeSubmission();

      mockFindById.mockReturnValue(execResult(submission));
      phasesService.getPhaseById.mockResolvedValue(openPhase());
      mockSave.mockResolvedValue(submission);

      const fileWithLatin1 = { ...mockFile, originalname: latin1EncodedName };
      await service.uploadDocument(validId, fileWithLatin1 as Express.Multer.File);

      expect(submission.documents[0].originalName).toBe(
        Buffer.from(latin1EncodedName, 'latin1').toString('utf8'),
      );
    });

    it('should throw BadRequestException for invalid submission ID format', async () => {
      await expect(service.uploadDocument('not-an-objectid', mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when submission does not exist', async () => {
      mockFindById.mockReturnValue(execResult(null));

      await expect(service.uploadDocument(validId, mockFile)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when phase does not exist', async () => {
      const submission = makeSubmission();

      mockFindById.mockReturnValue(execResult(submission));
      phasesService.getPhaseById.mockRejectedValue(
        new NotFoundException('Phase not found'),
      );

      await expect(service.uploadDocument(validId, mockFile)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when phase has no submission window configured', async () => {
      const submission = makeSubmission();

      mockFindById.mockReturnValue(execResult(submission));
      phasesService.getPhaseById.mockResolvedValue({
        submissionStart: null,
        submissionEnd: null,
      });

      await expect(service.uploadDocument(validId, mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject upload when maximum document count is reached', async () => {
      const submission = makeSubmission({
        documents: Array.from({ length: MAX_DOCUMENTS_PER_SUBMISSION }, () => ({
          originalName: 'existing.pdf',
          mimeType: 'application/pdf',
          uploadedAt: new Date(),
        })),
      });

      mockFindById.mockReturnValue(execResult(submission));
      phasesService.getPhaseById.mockResolvedValue(openPhase());

      await expect(service.uploadDocument(validId, mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects upload when submission window has closed', async () => {
      const submission = makeSubmission();

      mockFindById.mockReturnValue(execResult(submission));
      phasesService.getPhaseById.mockResolvedValue({
        submissionStart: new Date(Date.now() - 2 * oneHour),
        submissionEnd: new Date(Date.now() - oneHour),
      });

      await expect(service.uploadDocument(validId, mockFile)).rejects.toThrow(
        /Submission window has closed/,
      );
    });
  });

  describe('Jury Member Operations (assertJuryMember)', () => {
    const mockCommittee = {
      groups: [{ groupId: 'group-1' }],
      jury: [{ userId: 'prof-1' }],
    };

    beforeEach(() => {
      mockCommitteeModel.findOne.mockReset();
    });

    it('should pass if professor is in the committee jury for the group', async () => {
      mockCommitteeModel.findOne.mockReturnValue(execResult(mockCommittee));

      await expect(
        service.assertJuryMember('prof-1', 'group-1'),
      ).resolves.toBeUndefined();

      expect(mockCommitteeModel.findOne).toHaveBeenCalledWith({
        'groups.groupId': 'group-1',
      });
    });

    it('should throw NotFoundException if no committee is assigned to the group', async () => {
      mockCommitteeModel.findOne.mockReturnValue(execResult(null));

      await expect(service.assertJuryMember('prof-1', 'group-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if professor is NOT in the committee jury', async () => {
      mockCommitteeModel.findOne.mockReturnValue(execResult(mockCommittee));

      await expect(
        service.assertJuryMember('prof-unknown', 'group-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('validateSowEligibility (Process 6.6)', () => {
    it('should return canProceed true for Group C (Approved Revised Proposal)', async () => {
      mockGroupModel.findOne.mockReturnValue(execResult({ groupId: 'group-C' }));

      mockSubmissionModel.findOne.mockReturnValueOnce({
        sort: jest.fn().mockReturnValue(
          execResult({ status: 'APPROVED', type: 'REVISED_PROPOSAL' }),
        ),
      });

      mockSubmissionModel.findOne.mockReturnValueOnce({
        sort: jest.fn().mockReturnValue(execResult(null)),
      });

      const result = await service.validateSowEligibility('group-C');

      expect(result).toEqual({
        sowStatus: 'NOT_SUBMITTED',
        revisedProposalStatus: 'APPROVED',
        canProceed: true,
      });
    });

    it('should return canProceed false for Group A (Missing Proposal)', async () => {
      mockGroupModel.findOne.mockReturnValue(execResult({ groupId: 'group-A' }));

      mockSubmissionModel.findOne.mockReturnValueOnce({
        sort: jest.fn().mockReturnValue(execResult(null)),
      });

      mockSubmissionModel.findOne.mockReturnValueOnce({
        sort: jest.fn().mockReturnValue(execResult(null)),
      });

      const result = await service.validateSowEligibility('group-A');

      expect(result).toEqual({
        sowStatus: 'NOT_SUBMITTED',
        revisedProposalStatus: 'MISSING',
        canProceed: false,
      });
    });

    it('should return canProceed false for Group B (Pending/Rejected)', async () => {
      mockGroupModel.findOne.mockReturnValue(execResult({ groupId: 'group-B' }));

      mockSubmissionModel.findOne.mockReturnValueOnce({
        sort: jest.fn().mockReturnValue(
          execResult({ status: 'REJECTED', type: 'REVISED_PROPOSAL' }),
        ),
      });

      mockSubmissionModel.findOne.mockReturnValueOnce({
        sort: jest.fn().mockReturnValue(execResult(null)),
      });

      const result = await service.validateSowEligibility('group-B');

      expect(result).toEqual({
        sowStatus: 'NOT_SUBMITTED',
        revisedProposalStatus: 'REJECTED',
        canProceed: false,
      });
    });

    it('should throw NotFoundException for non-existent group ID', async () => {
      mockGroupModel.findOne.mockReturnValue(execResult(null));

      await expect(service.validateSowEligibility('invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Review Comments and Revision Requests', () => {
    const reviewerUserId = 'prof-1';
    const mockCommittee = {
      groups: [{ groupId: 'group-1' }],
      jury: [{ userId: 'prof-1' }],
    };

    beforeEach(() => {
      mockCommitteeModel.findOne.mockReset();
    });

    describe('addComment', () => {
      it('should add a comment successfully', async () => {
        const submission = makeSubmission({ comments: [] });
        mockFindById.mockReturnValue(execResult(submission));
        mockCommitteeModel.findOne.mockReturnValue(execResult(mockCommittee));
        mockSave.mockResolvedValue(submission);

        const dto = { commentText: 'Harika bir proje!' };
        const result = await service.addComment(reviewerUserId, validId, dto);

        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(submission.comments).toHaveLength(1);
        expect(result.commentText).toBe('Harika bir proje!');
        expect(result.reviewerUserId).toBe(reviewerUserId);
      });

      it('should throw ForbiddenException if reviewer is not a jury member', async () => {
        const submission = makeSubmission();
        mockFindById.mockReturnValue(execResult(submission));
        mockCommitteeModel.findOne.mockReturnValue(
          execResult({ groups: [{ groupId: 'group-1' }], jury: [{ userId: 'other-prof' }] }),
        );

        await expect(
          service.addComment('bad-prof', validId, { commentText: 'Test' }),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('listComments', () => {
      it('should list comments successfully', async () => {
        const submission = makeSubmission({ comments: [{ commentText: 'Mevcut Yorum' }] });
        mockFindById.mockReturnValue(execResult(submission));
        mockCommitteeModel.findOne.mockReturnValue(execResult(mockCommittee));

        const result = await service.listComments(reviewerUserId, validId);
        
        expect(result).toHaveLength(1);
        expect(result[0].commentText).toBe('Mevcut Yorum');
      });
    });

    describe('createRevisionRequest', () => {
      it('should create a revision request successfully with future date', async () => {
        const submission = makeSubmission({ revisionRequests: [] });
        mockFindById.mockReturnValue(execResult(submission));
        mockCommitteeModel.findOne.mockReturnValue(execResult(mockCommittee));
        mockSave.mockResolvedValue(submission);

        const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        const result = await service.createRevisionRequest(reviewerUserId, validId, { revisionDueDatetime: futureDate });

        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(submission.revisionRequests).toHaveLength(1);
        expect(result.status).toBe('PENDING');
        expect(result.requesterUserId).toBe(reviewerUserId);
      });

      it('should throw BadRequestException if revision due date is in the past', async () => {
        const submission = makeSubmission();
        mockFindById.mockReturnValue(execResult(submission));
        mockCommitteeModel.findOne.mockReturnValue(execResult(mockCommittee));

        const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        await expect(
          service.createRevisionRequest(reviewerUserId, validId, { revisionDueDatetime: pastDate }),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });
});