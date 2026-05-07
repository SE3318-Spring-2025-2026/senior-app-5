import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../auth/enums/role.enum';
import { Group, GroupStatus } from '../groups/group.entity';
import { PhasesService } from '../phases/phases.service';
import { User } from '../users/data/user.schema';
import { SubmissionsService } from './submissions.service';
import { Submission } from './schemas/submission.schema';
import { Committee } from '../committees/schemas/committee.schema';

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('file-content')),
}));

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
  mockSubmissionModel.find = jest.fn().mockReturnThis();
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

  const makeSubmission = (overrides = {}) => ({
    _id: validId,
    title: 'Test Proposal',
    groupId: 'group-1',
    type: 'INITIAL',
    phaseId: 'phase-1',
    documents: [] as any[],
    get: jest.fn((field: string) => (makeSubmission as any)[field]),
    save: mockSave,
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSave.mockReset();
    mockSubmissionModel.mockClear();
    mockFindById.mockReset();
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
  });

  describe('findOne', () => {
    it('should return a submission for a valid ObjectId when found', async () => {
      const mockSubmission = { _id: validId, title: 'Test Proposal' };
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockSubmission) });

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
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(submission) });

      const result = await service.findById(validId);

      expect(mockFindById).toHaveBeenCalledWith(validId);
      expect(result).toEqual(submission);
    });

    it('should throw NotFoundException when valid ObjectId is not found', async () => {
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.findById(otherValidId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid ObjectId format', async () => {
      await expect(service.findById('submission-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getCompleteness', () => {
    it('should return completeness when all required fields are present', async () => {
      const submission: any = {
        _id: validId,
        title: 'Test Proposal',
        groupId: 'group-1',
        type: 'INITIAL',
        phaseId: 'phase-1',
        documents: [{ originalName: 'doc.pdf', mimeType: 'application/pdf', uploadedAt: new Date() }],
      };
      submission.get = jest.fn((field: string) => submission[field]);
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(submission) });
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
      const submission: any = {
        _id: otherValidId,
        title: '',
        groupId: 'group-1',
        type: 'INITIAL',
        phaseId: 'phase-1',
        documents: [],
      };
      submission.get = jest.fn((field: string) => submission[field]);
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(submission) });
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
      mockGroupModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(
        service.assertAuthorizedGroupMember(
          { userId: 'student-id', role: Role.Student },
          'missing-group',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when group is not active', async () => {
      mockGroupModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ groupId: 'group-1', status: GroupStatus.DISBANDED }),
      });

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
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(submission) });
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
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(submission) });
      phasesService.getPhaseById.mockResolvedValue(openPhase());
      mockSave.mockResolvedValue(submission);

      await service.uploadDocument(validId, mockFile);

      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should decode latin1-encoded filename to UTF-8', async () => {
      const latin1EncodedName = Buffer.from('test.pdf', 'utf8').toString('latin1');
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
      await expect(service.uploadDocument('not-an-objectid', mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when submission does not exist', async () => {
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.uploadDocument(validId, mockFile)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when phase does not exist', async () => {
      const submission = makeSubmission();
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(submission) });
      phasesService.getPhaseById.mockRejectedValue(new NotFoundException('Phase not found'));

      await expect(service.uploadDocument(validId, mockFile)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when phase has no submission window configured', async () => {
      const submission = makeSubmission();
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(submission) });
      phasesService.getPhaseById.mockResolvedValue({ submissionStart: null, submissionEnd: null });

      await expect(service.uploadDocument(validId, mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject upload when before submission window start', async () => {
      const submission = makeSubmission();
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(submission) });
      phasesService.getPhaseById.mockResolvedValue({
        submissionStart: new Date(Date.now() + oneHour),
        submissionEnd: new Date(Date.now() + 2 * oneHour),
      });

      await expect(service.uploadDocument(validId, mockFile)).rejects.toThrow(
        /Submission window has not started yet/,
      );
    });

    it('should reject upload when submission window has closed', async () => {
      const submission = makeSubmission();
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(submission) });
      phasesService.getPhaseById.mockResolvedValue({
        submissionStart: new Date(Date.now() - 2 * oneHour),
        submissionEnd: new Date(Date.now() - oneHour),
      });

      await expect(service.uploadDocument(validId, mockFile)).rejects.toThrow(
        /Submission window has closed/,
      );
    });

    it('should reject upload when maximum document count is reached', async () => {
      const submission = makeSubmission({
        documents: Array.from({ length: 10 }, () => ({ // 10 = MAX_DOCUMENTS_PER_SUBMISSION
          originalName: 'existing.pdf',
          mimeType: 'application/pdf',
          uploadedAt: new Date(),
        })),
      });
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(submission) });
      phasesService.getPhaseById.mockResolvedValue(openPhase());

      await expect(service.uploadDocument(validId, mockFile)).rejects.toThrow(
        BadRequestException,
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
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCommittee),
      });

      await expect(service.assertJuryMember('prof-1', 'group-1')).resolves.toBeUndefined();
      
      expect(mockCommitteeModel.findOne).toHaveBeenCalledWith({ 'groups.groupId': 'group-1' });
    });

    it('should throw NotFoundException if no committee is assigned to the group', async () => {
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.assertJuryMember('prof-1', 'group-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if professor is NOT in the committee jury', async () => {
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCommittee),
      });

      await expect(service.assertJuryMember('prof-unknown', 'group-1')).rejects.toThrow(ForbiddenException);
    });
  });
});