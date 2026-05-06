import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Committee } from '../committees/schemas/committee.schema';
import { Group, GroupStatus } from '../groups/group.entity';
import { PhasesService } from '../phases/phases.service';
import { User } from '../users/data/user.schema';
import { Role } from '../auth/enums/role.enum';
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

  const mockSave = jest.fn();
  const mockSubmissionModel: any = jest.fn((payload) => ({
    ...payload,
    save: mockSave,
  }));
  mockSubmissionModel.findById = jest.fn();
  mockSubmissionModel.find = jest.fn();

  const mockGroupModel = { findOne: jest.fn() };
  const mockUserModel = { findById: jest.fn() };
  const mockCommitteeModel = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSave.mockReset();
    mockSubmissionModel.mockClear();
    mockSubmissionModel.findById.mockReset();
    mockSubmissionModel.find.mockReset();
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
    it('saves submission when request time is within configured window', async () => {
      const now = new Date();
      const oneHour = 60 * 60 * 1000;
      const savedSubmission = {
        _id: 'submission-1',
        title: 'Proposal',
        groupId: 'group-1',
        type: 'INITIAL',
        phaseId: 'phase-1',
        status: 'Pending',
        submittedAt: now,
      };
      phasesService.findByPhaseId.mockResolvedValue({
        phaseId: 'phase-1',
        submissionStart: new Date(now.getTime() - oneHour),
        submissionEnd: new Date(now.getTime() + oneHour),
      });
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

  describe('findById/findOne', () => {
    it('returns a submission when found', async () => {
      const submissionId = '64f1a2b3c4d5e6f7a8b9c0d3';
      const submission = { _id: submissionId, title: 'Test' };
      mockSubmissionModel.findById.mockReturnValue(execResult(submission));

      await expect(service.findOne(submissionId)).resolves.toEqual(submission);
      expect(mockSubmissionModel.findById).toHaveBeenCalledWith(submissionId);
    });

    it('throws NotFoundException when submission is missing', async () => {
      mockSubmissionModel.findById.mockReturnValue(execResult(null));

      await expect(
        service.findById('64f1a2b3c4d5e6f7a8b9c0d1'),
      ).rejects.toThrow(NotFoundException);
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

  describe('assertAuthorizedGroupMember', () => {
    it('allows admin users without membership lookup', async () => {
      await expect(
        service.assertAuthorizedGroupMember(
          { userId: 'admin-id', role: Role.Admin },
          'group-1',
        ),
      ).resolves.toBeUndefined();
      expect(mockGroupModel.findOne).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when group does not exist', async () => {
      mockGroupModel.findOne.mockReturnValue(execResult(null));

      await expect(
        service.assertAuthorizedGroupMember(
          { userId: 'student-id', role: Role.Student },
          'missing-group',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when group is not active', async () => {
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
    const validId = '507f1f77bcf86cd799439011';
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

    const makeSubmission = (overrides = {}) => ({
      _id: validId,
      phaseId: 'phase-1',
      documents: [] as any[],
      save: mockSave,
      ...overrides,
    });

    it('adds document metadata to submission on valid upload', async () => {
      const submission = makeSubmission();
      mockSubmissionModel.findById.mockReturnValue(execResult(submission));
      phasesService.getPhaseById.mockResolvedValue(openPhase());
      mockSave.mockResolvedValue(submission);

      const result = await service.uploadDocument(validId, mockFile);

      expect(result.message).toBe('Document uploaded successfully.');
      expect(submission.documents).toHaveLength(1);
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('rejects invalid submissionId format', async () => {
      await expect(
        service.uploadDocument('not-an-objectid', mockFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when maximum document count is reached', async () => {
      const submission = makeSubmission({
        documents: Array.from({ length: MAX_DOCUMENTS_PER_SUBMISSION }, () => ({
          originalName: 'doc.pdf',
          mimeType: 'application/pdf',
          uploadedAt: new Date(),
        })),
      });
      mockSubmissionModel.findById.mockReturnValue(execResult(submission));
      phasesService.getPhaseById.mockResolvedValue(openPhase());

      await expect(service.uploadDocument(validId, mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects upload when submission window has closed', async () => {
      const submission = makeSubmission();
      mockSubmissionModel.findById.mockReturnValue(execResult(submission));
      phasesService.getPhaseById.mockResolvedValue({
        submissionStart: new Date(Date.now() - 2 * oneHour),
        submissionEnd: new Date(Date.now() - oneHour),
      });

      await expect(service.uploadDocument(validId, mockFile)).rejects.toThrow(
        /Submission window has closed/,
      );
    });
  });
});
