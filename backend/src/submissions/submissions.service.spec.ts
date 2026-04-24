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
import { PhasesService } from '../phases/phases.service';
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
  mockSubmissionModel.schema = {
    path: jest.fn().mockReturnValue(true),
  };

  const mockGroupModel = {
    findOne: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSave.mockReset();
    mockSubmissionModel.mockClear();
    mockFindById.mockReset();
    mockGroupModel.findOne.mockReset();
    mockUserModel.findById.mockReset();

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
          provide: getModelToken(Group.name),
          useValue: mockGroupModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
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
      mockFindById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSubmission),
      });
      const result = await service.findOne('sub-1');
      expect(mockFindById).toHaveBeenCalledWith('sub-1');
      expect(result).toEqual(mockSubmission);
    });

    it('should throw NotFoundException if submission not found', async () => {
      mockFindById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
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
      const submission = { _id: 'sub-1', title: 'Test' };
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(submission) });
      const result = await service.findById('sub-1');
      expect(mockFindById).toHaveBeenCalledWith('sub-1');
      expect(result).toEqual(submission);
    });

    it('should throw NotFoundException when submission not found', async () => {
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.findById('sub-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCompleteness (Original Tests - FIXED)', () => {
    it('should return completeness when all required fields are present', async () => {
      const submission = {
        _id: 'sub-1',
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
      const result = await service.getCompleteness('sub-1');
      expect(result).toEqual({ submissionId: 'sub-1', isComplete: true, missingFields: [], requiredFields: ['title', 'documents'], phaseId: 'phase-1' });
    });

    it('should return incompleteness when required fields are missing', async () => {
      const submission = {
        _id: 'sub-1',
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
      const result = await service.getCompleteness('sub-1');
      expect(result).toEqual({ submissionId: 'sub-1', isComplete: false, missingFields: ['title', 'documents'], requiredFields: ['title', 'documents'], phaseId: 'phase-1' });
    });
  });

  describe('QA Completeness Logic (Issue #65)', () => {
    it('should return isComplete: false and list ALL missing fields if nothing is provided', async () => {
      const mockSubmission = { _id: 'sub-1', phaseId: 'phase-1', documents: [], get: jest.fn().mockReturnValue(null) };
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockSubmission) });
      phasesService.findByPhaseId.mockResolvedValue({ phaseId: 'phase-1', requiredFields: ['documents', 'projectTitle'] });

      const result = await service.getCompleteness('sub-1');
      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toEqual(['documents', 'projectTitle']);
    });

    it('should return isComplete: false and exactly the missing fields for a partial submission', async () => {
      const mockSubmission = { _id: 'sub-2', phaseId: 'phase-1', documents: [{ originalName: 'doc.pdf' }], get: jest.fn().mockReturnValue('') };
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockSubmission) });
      phasesService.findByPhaseId.mockResolvedValue({ requiredFields: ['documents', 'projectTitle'] });

      const result = await service.getCompleteness('sub-2');
      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toEqual(['projectTitle']);
    });

    it('should return isComplete: true and empty missingFields array when everything is met', async () => {
      const mockSubmission = { _id: 'sub-3', phaseId: 'phase-2', documents: [{ originalName: 'doc.pdf' }], get: jest.fn().mockReturnValue('Title') };
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockSubmission) });
      phasesService.findByPhaseId.mockResolvedValue({ requiredFields: ['documents', 'projectTitle'] });

      const result = await service.getCompleteness('sub-3');
      expect(result.isComplete).toBe(true);
      expect(result.missingFields).toEqual([]);
    });

    it('should throw NotFoundException if Phase does not exist', async () => {
      const mockSubmission = { _id: 'sub-4', phaseId: 'invalid-phase' };
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockSubmission) });
      phasesService.findByPhaseId.mockResolvedValue(null);

      await expect(service.getCompleteness('sub-4')).rejects.toThrow(NotFoundException);
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
      expect(mockUserModel.findById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when group does not exist', async () => {
      mockGroupModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.assertAuthorizedGroupMember(
          { userId: 'student-id', role: Role.Student },
          'missing-group',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when group is not active', async () => {
      mockGroupModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          groupId: 'group-1',
          status: GroupStatus.DISBANDED,
        }),
      });

      await expect(
        service.assertAuthorizedGroupMember(
          { userId: 'student-id', role: Role.Student },
          'group-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user is not in target group', async () => {
      mockGroupModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          groupId: 'group-1',
          status: GroupStatus.ACTIVE,
        }),
      });
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'student-id',
          teamId: 'group-2',
        }),
      });

      await expect(
        service.assertAuthorizedGroupMember(
          { userId: 'student-id', role: Role.Student },
          'group-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow active group member', async () => {
      mockGroupModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          groupId: 'group-1',
          status: GroupStatus.ACTIVE,
        }),
      });
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'student-id',
          teamId: 'group-1',
        }),
      });

      await expect(
        service.assertAuthorizedGroupMember(
          { userId: 'student-id', role: Role.Student },
          'group-1',
        ),
      ).resolves.toBeUndefined();
    });
  });
});
