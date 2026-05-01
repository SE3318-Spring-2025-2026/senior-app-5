import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../auth/enums/role.enum';
import { Group, GroupStatus } from '../groups/group.entity';
import { PhasesService } from '../phases/phases.service';
import { User } from '../users/data/user.schema';
import { SubmissionsService } from './submissions.service';
import { Submission } from './schemas/submission.schema';

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let phasesService: { findByPhaseId: jest.Mock; getPhaseById: jest.Mock };
  const mockSave = jest.fn();
  const mockFindById = jest.fn().mockReturnValue({ exec: jest.fn() });
  
  const mockSubmissionModel: any = jest.fn().mockImplementation((payload: Record<string, unknown>) => ({
    ...payload,
    save: mockSave,
  }));
  
  (mockSubmissionModel as any).findById = mockFindById;
  mockSubmissionModel.find = jest.fn().mockReturnThis();
  mockSubmissionModel.sort = jest.fn().mockReturnThis();
  mockSubmissionModel.exec = jest.fn();
  mockSubmissionModel.schema = { path: jest.fn().mockReturnValue(true) };

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
        { provide: getModelToken(Submission.name), useValue: mockSubmissionModel },
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

  describe('findAll (Data Leak Prevention)', () => {
    it('should return all submissions when no groupId is provided (Admin/Coordinator behavior)', async () => {
      const mockSubmissions = [{ title: 'Doc 1' }];
      mockSubmissionModel.exec.mockResolvedValueOnce(mockSubmissions);
      
      const result = await service.findAll(undefined);
      
      expect(mockSubmissionModel.find).toHaveBeenCalledWith({});
      expect(mockSubmissionModel.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockSubmissions);
    });

    it('should filter submissions by groupId', async () => {
      const groupId = 'group-123';
      mockSubmissionModel.exec.mockResolvedValueOnce([]);
      
      await service.findAll(groupId);
      
      expect(mockSubmissionModel.find).toHaveBeenCalledWith({ groupId });
      expect(mockSubmissionModel.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  describe('findOne', () => {
    it('should return a submission if found', async () => {
      const validId = '507f1f77bcf86cd799439011';
      const mockSubmission = { _id: validId, title: 'Test Proposal' };
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockSubmission) });
      const result = await service.findOne(validId);
      expect(mockFindById).toHaveBeenCalledWith(validId);
      expect(result).toEqual(mockSubmission);
    });

    it('should throw NotFoundException if submission not found', async () => {
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.findOne('invalid-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('createSubmission', () => {
    it('should return 404 when phaseId is invalid', async () => {
      phasesService.findByPhaseId.mockRejectedValue(new NotFoundException('Phase not found'));
      await expect(
        service.createSubmission({ title: 'Proposal', groupId: 'group-1', type: 'INITIAL', phaseId: 'missing-phase' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return 400 when submission window is not configured', async () => {
      phasesService.findByPhaseId.mockResolvedValue({ phaseId: 'phase-1', submissionStart: undefined, submissionEnd: undefined });
      await expect(
        service.createSubmission({ title: 'Proposal', groupId: 'group-1', type: 'INITIAL', phaseId: 'phase-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return 400 when submission is outside configured window', async () => {
      const now = new Date();
      const oneHour = 60 * 60 * 1000;
      phasesService.findByPhaseId.mockResolvedValue({
        phaseId: 'phase-1',
        submissionStart: new Date(now.getTime() - 2 * oneHour),
        submissionEnd: new Date(now.getTime() - oneHour),
      });
      await expect(
        service.createSubmission({ title: 'Proposal', groupId: 'group-1', type: 'INITIAL', phaseId: 'phase-1' }),
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

  describe('findById', () => {
    it('should return submission when found', async () => {
      const validId = '507f1f77bcf86cd799439011';
      const submission = { _id: validId, title: 'Test' };
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(submission) });
      const result = await service.findById(validId);
      expect(mockFindById).toHaveBeenCalledWith(validId);
      expect(result).toEqual(submission);
    });

    it('should throw NotFoundException when submission not found', async () => {
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.findById('64f1a2b3c4d5e6f7a8b9c0d1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCompleteness', () => {
    it('should return completeness when all required fields are present', async () => {
      const validId = '507f1f77bcf86cd799439011';
      const submission = {
        _id: validId,
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
      const result = await service.getCompleteness(validId);
      expect(result).toEqual({ submissionId: validId, isComplete: true, missingFields: [], requiredFields: ['title', 'documents'], phaseId: 'phase-1' });
    });

    it('should return incompleteness when required fields are missing', async () => {
      const validId = '507f1f77bcf86cd799439012';
      const submission = {
        _id: validId,
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
      const result = await service.getCompleteness(validId);
      expect(result).toEqual({ submissionId: validId, isComplete: false, missingFields: ['title', 'documents'], requiredFields: ['title', 'documents'], phaseId: 'phase-1' });
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

    it('should throw ForbiddenException when user is not in target group', async () => {
      mockGroupModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ groupId: 'group-1', status: GroupStatus.ACTIVE }) });
      await expect(service.assertAuthorizedGroupMember({ userId: 'student-id', role: Role.Student, groupId: 'group-2' }, 'group-1')).rejects.toThrow(ForbiddenException);
      
      // Explicitly assert that no DB lookup is happening
      expect(mockUserModel.findById).not.toHaveBeenCalled();
    });

    it('should allow active group member', async () => {
      mockGroupModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ groupId: 'group-1', status: GroupStatus.ACTIVE }) });
      await expect(service.assertAuthorizedGroupMember({ userId: 'student-id', role: Role.Student, groupId: 'group-1' }, 'group-1')).resolves.toBeUndefined();
      
      // Explicitly assert that no DB lookup is happening
      expect(mockUserModel.findById).not.toHaveBeenCalled();
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