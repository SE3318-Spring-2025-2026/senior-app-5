import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Group, GroupStatus } from '../groups/group.entity';
import { Role } from '../auth/enums/role.enum';
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

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let phasesService: { findByPhaseId: jest.Mock; getPhaseById: jest.Mock };
  const mockSave = jest.fn();
  const mockFindById = jest.fn().mockReturnValue({ exec: jest.fn() });

  const mockSubmissionModel: any = jest
    .fn()
    .mockImplementation((payload: Record<string, unknown>) => ({
      ...payload,
      save: mockSave,
    }));

  mockSubmissionModel.findById = mockFindById;
  mockSubmissionModel.find = jest.fn().mockReturnThis();
  mockSubmissionModel.sort = jest.fn().mockReturnThis();
  mockSubmissionModel.exec = jest.fn();

  const mockGroupModel = { findOne: jest.fn() };
  const mockUserModel = { findById: jest.fn() };



  beforeEach(async () => {
    jest.clearAllMocks();
    mockSave.mockReset();
    mockSubmissionModel.mockClear();
    mockFindById.mockReset();
    mockGroupModel.findOne.mockReset();
    mockUserModel.findById.mockReset();

    phasesService = { findByPhaseId: jest.fn(), getPhaseById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        {
          provide: getModelToken(Submission.name),
          useValue: mockSubmissionModel,
        },
        { provide: getModelToken(Group.name), useValue: mockGroupModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: PhasesService, useValue: phasesService },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadDocument', () => {
    it('should throw BadRequestException for invalid submissionId format', async () => {
      const file = {
        originalname: 'report.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('binary-data'),
      } as Express.Multer.File;

      await expect(
        service.uploadDocument('not-an-objectid', file),
      ).rejects.toThrow(BadRequestException);
    });

    it('should save submission when request time is within configured window', async () => {
      const now = new Date();
      const oneHour = 60 * 60 * 1000;
      const savedSubmission = { _id: 'submission-1', title: 'Proposal', groupId: 'group-1', type: 'INITIAL', phaseId: 'phase-1', status: 'Pending', submittedAt: now };
      phasesService.findByPhaseId.mockResolvedValue({
        phaseId: 'phase-1',
        submissionStart: new Date(now.getTime() - oneHour),
        submissionEnd: new Date(now.getTime() + oneHour),
      });
      mockSave.mockResolvedValue(savedSubmission);
      const result = await service.createSubmission({ title: 'Proposal', groupId: 'group-1', type: 'INITIAL', phaseId: 'phase-1' });
      expect(mockSubmissionModel).toHaveBeenCalledTimes(1);
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result).toEqual(savedSubmission);
    });
  });

  describe('findOne', () => {
    it('should return a submission if found', async () => {
      const submissionId = '64f1a2b3c4d5e6f7a8b9c0d1';
      const mockSubmission = { _id: submissionId, title: 'Test Proposal' };
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockSubmission) });
      const result = await service.findOne(submissionId);
      expect(mockFindById).toHaveBeenCalledWith(submissionId);
      expect(result).toEqual(mockSubmission);
    });

    it('should throw NotFoundException if submission not found', async () => {
      const submissionId = '64f1a2b3c4d5e6f7a8b9c0d2';
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.findOne(submissionId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('should return submission when found', async () => {
      const submissionId = '64f1a2b3c4d5e6f7a8b9c0d3';
      const submission = { _id: submissionId, title: 'Test' };
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(submission) });
      const result = await service.findById(submissionId);
      expect(mockFindById).toHaveBeenCalledWith(submissionId);
      expect(result).toEqual(submission);
    });

    it('should throw NotFoundException when submission not found', async () => {
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.findById('64f1a2b3c4d5e6f7a8b9c0d1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCompleteness', () => {
    it('should return completeness when all required fields are present', async () => {
      const submissionId = '64f1a2b3c4d5e6f7a8b9c0d4';
      const submission = {
        _id: submissionId,
        title: 'Test Proposal',
        groupId: 'group-1',
        type: 'INITIAL',
        phaseId: 'phase-1',
        documents: [{ originalName: 'doc.pdf', mimeType: 'application/pdf', uploadedAt: new Date() }],
        get: jest.fn((field: string) => (submission as any)[field]),
      };
      const phase = { phaseId: 'phase-1', requiredFields: ['title', 'documents'] };
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(submission) });
      phasesService.findByPhaseId.mockResolvedValue(phase);
      const result = await service.getCompleteness(submissionId);
      expect(result).toEqual({ submissionId, isComplete: true, missingFields: [], requiredFields: ['title', 'documents'], phaseId: 'phase-1' });
    });

    it('should return incompleteness when required fields are missing', async () => {
      const submissionId = '64f1a2b3c4d5e6f7a8b9c0d5';
      const submission = {
        _id: submissionId,
        title: '',
        groupId: 'group-1',
        type: 'INITIAL',
        phaseId: 'phase-1',
        documents: [],
        get: jest.fn((field: string) => (submission as any)[field]),
      };
      const phase = { phaseId: 'phase-1', requiredFields: ['title', 'documents'] };
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(submission) });
      phasesService.findByPhaseId.mockResolvedValue(phase);
      const result = await service.getCompleteness(submissionId);
      expect(result).toEqual({ submissionId, isComplete: false, missingFields: ['title', 'documents'], requiredFields: ['title', 'documents'], phaseId: 'phase-1' });
    });
  });

  describe('assertAuthorizedGroupMember', () => {
    it('should allow admin users without membership lookup', async () => {
      await expect(service.assertAuthorizedGroupMember({ userId: 'admin-id', role: Role.Admin }, 'group-1')).resolves.toBeUndefined();
      expect(mockGroupModel.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when group does not exist', async () => {
      mockGroupModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.assertAuthorizedGroupMember({ userId: 'student-id', role: Role.Student }, 'missing-group')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when group is not active', async () => {
      mockGroupModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ groupId: 'group-1', status: GroupStatus.DISBANDED }) });
      await expect(service.assertAuthorizedGroupMember({ userId: 'student-id', role: Role.Student }, 'group-1')).rejects.toThrow(ForbiddenException);
    });

  });

  describe('uploadDocument (Document Integrity - Issue #68)', () => {
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

    it('should add document metadata to submission on valid upload', async () => {
      const submission = makeSubmission();
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(submission) });
      phasesService.getPhaseById.mockResolvedValue(openPhase());
      mockSave.mockResolvedValue(submission);

      const result = await service.uploadDocument(validId, mockFile);

      expect(result.message).toBe('Document uploaded successfully.');
      expect(submission.documents).toHaveLength(1);
      expect(submission.documents[0].originalName).toBe('test-document.pdf');
      expect(submission.documents[0].mimeType).toBe('application/pdf');
      expect(submission.documents[0].uploadedAt).toBeInstanceOf(Date);
    });

    it('should persist document by calling save once', async () => {
      const submission = makeSubmission();
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(submission) });
      phasesService.getPhaseById.mockResolvedValue(openPhase());
      mockSave.mockResolvedValue(submission);

      await service.uploadDocument(validId, mockFile);

      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should decode latin1-encoded filename to UTF-8', async () => {
      const latin1EncodedName = Buffer.from('tést.pdf', 'utf8').toString('latin1');
      const submission = makeSubmission();
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(submission) });
      phasesService.getPhaseById.mockResolvedValue(openPhase());
      mockSave.mockResolvedValue(submission);

      const fileWithLatin1 = { ...mockFile, originalname: latin1EncodedName };
      await service.uploadDocument(validId, fileWithLatin1 as Express.Multer.File);

      expect(submission.documents[0].originalName).toBe(
        Buffer.from(latin1EncodedName, 'latin1').toString('utf8'),
      );
    });

    it('should throw BadRequestException for invalid submission ID format', async () => {
      await expect(service.uploadDocument('not-an-objectid', mockFile))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when submission does not exist', async () => {
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.uploadDocument(validId, mockFile))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when phase does not exist', async () => {
      const submission = makeSubmission();
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(submission) });
      phasesService.getPhaseById.mockRejectedValue(new NotFoundException('Phase not found'));

      await expect(service.uploadDocument(validId, mockFile))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when phase has no submission window configured', async () => {
      const submission = makeSubmission();
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(submission) });
      phasesService.getPhaseById.mockResolvedValue({ submissionStart: null, submissionEnd: null });

      await expect(service.uploadDocument(validId, mockFile))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject upload when before submission window start', async () => {
      const submission = makeSubmission();
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(submission) });
      phasesService.getPhaseById.mockResolvedValue({
        submissionStart: new Date(Date.now() + oneHour),
        submissionEnd: new Date(Date.now() + 2 * oneHour),
      });

      await expect(service.uploadDocument(validId, mockFile))
        .rejects.toThrow(/Submission window has not started yet/);
    });

    it('should reject upload when submission window has closed', async () => {
      const submission = makeSubmission();
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(submission) });
      phasesService.getPhaseById.mockResolvedValue({
        submissionStart: new Date(Date.now() - 2 * oneHour),
        submissionEnd: new Date(Date.now() - oneHour),
      });

      await expect(service.uploadDocument(validId, mockFile))
        .rejects.toThrow(/Submission window has closed/);
    });
  });
});
