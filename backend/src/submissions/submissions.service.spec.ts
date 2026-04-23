import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { PhasesService } from '../phases/phases.service';
import { SubmissionsService } from './submissions.service';
import { Submission } from './schemas/submission.schema';

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let phasesService: { findByPhaseId: jest.Mock };

  const mockSave = jest.fn();
  const mockFindById = jest.fn().mockReturnValue({
    exec: jest.fn(),
  });

  const mockSubmissionModel: any = jest
    .fn()
    .mockImplementation((payload: Record<string, unknown>) => ({
      ...payload,
      save: mockSave,
    }));
  (mockSubmissionModel as any).findById = mockFindById;

  mockSubmissionModel.find = jest.fn().mockReturnThis();
  mockSubmissionModel.sort = jest.fn().mockReturnThis();
  mockSubmissionModel.exec = jest.fn();
  mockSubmissionModel.findById = jest.fn().mockReturnThis();

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSave.mockReset();
    mockSubmissionModel.mockClear();
    mockFindById.mockReset();

    phasesService = {
      findByPhaseId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        {
          provide: getModelToken(Submission.name),
          useValue: mockSubmissionModel,
        },
        {
          provide: PhasesService,
          useValue: phasesService,
        },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all submissions when no groupId is provided', async () => {
      const mockSubmissions = [{ title: 'Doc 1' }, { title: 'Doc 2' }];
      mockSubmissionModel.exec.mockResolvedValueOnce(mockSubmissions);

      const result = await service.findAll();

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
      const mockSubmission = { _id: 'sub-1', title: 'Test Proposal' };
      mockSubmissionModel.exec.mockResolvedValueOnce(mockSubmission);

      const result = await service.findOne('sub-1');

      expect(mockSubmissionModel.findById).toHaveBeenCalledWith('sub-1');
      expect(result).toEqual(mockSubmission);
    });

    it('should throw NotFoundException if submission not found', async () => {
      mockSubmissionModel.exec.mockResolvedValueOnce(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createSubmission', () => {
    it('should return 404 when phaseId is invalid', async () => {
      phasesService.findByPhaseId.mockRejectedValue(
        new NotFoundException('Phase not found'),
      );

      await expect(
        service.createSubmission({
          title: 'Proposal',
          groupId: 'group-1',
          type: 'INITIAL',
          phaseId: 'missing-phase',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return 400 when submission window is not configured', async () => {
      phasesService.findByPhaseId.mockResolvedValue({
        phaseId: 'phase-1',
        submissionStart: undefined,
        submissionEnd: undefined,
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

    it('should return 400 when submission is outside configured window', async () => {
      const now = new Date();
      const oneHour = 60 * 60 * 1000;

      phasesService.findByPhaseId.mockResolvedValue({
        phaseId: 'phase-1',
        submissionStart: new Date(now.getTime() - 2 * oneHour),
        submissionEnd: new Date(now.getTime() - oneHour),
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

    it('should save submission when request time is within configured window', async () => {
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
  });

  describe('findById', () => {
    it('should return submission when found', async () => {
      const submission = { _id: 'sub-1', title: 'Test' };
      mockFindById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(submission),
      });

      const result = await service.findById('sub-1');

      expect(mockFindById).toHaveBeenCalledWith('sub-1');
      expect(result).toEqual(submission);
    });

    it('should throw NotFoundException when submission not found', async () => {
      mockFindById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findById('sub-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCompleteness', () => {
    it('should return completeness when all required fields are present', async () => {
      const submission = {
        _id: 'sub-1',
        title: 'Test Proposal',
        groupId: 'group-1',
        type: 'INITIAL',
        phaseId: 'phase-1',
        documents: [{ originalName: 'doc.pdf', mimeType: 'application/pdf', uploadedAt: new Date() }],
      };
      const phase = {
        phaseId: 'phase-1',
        requiredFields: ['title', 'documents'],
      };

      mockFindById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(submission),
      });
      phasesService.findByPhaseId.mockResolvedValue(phase);

      const result = await service.getCompleteness('sub-1');

      expect(result).toEqual({
        submissionId: 'sub-1',
        isComplete: true,
        missingFields: [],
        requiredFields: ['title', 'documents'],
        phaseId: 'phase-1',
      });
    });

    it('should return incompleteness when required fields are missing', async () => {
      const submission = {
        _id: 'sub-1',
        title: '',
        groupId: 'group-1',
        type: 'INITIAL',
        phaseId: 'phase-1',
        documents: [],
      };
      const phase = {
        phaseId: 'phase-1',
        requiredFields: ['title', 'documents'],
      };

      mockFindById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(submission),
      });
      phasesService.findByPhaseId.mockResolvedValue(phase);

      const result = await service.getCompleteness('sub-1');

      expect(result).toEqual({
        submissionId: 'sub-1',
        isComplete: false,
        missingFields: ['title', 'documents'],
        requiredFields: ['title', 'documents'],
        phaseId: 'phase-1',
      });
    });
  });
});
