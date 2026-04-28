import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

describe('SubmissionsController', () => {
  let controller: SubmissionsController;
  let service: SubmissionsService;

  const mockSubmissionsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    uploadDocument: jest.fn(),
    createSubmission: jest.fn(),
    getCompleteness: jest.fn(),
    assertAuthorizedGroupMember: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionsController],
      providers: [
        {
          provide: SubmissionsService,
          useValue: mockSubmissionsService,
        },
      ],
    }).compile();

    controller = module.get<SubmissionsController>(SubmissionsController);
    service = module.get<SubmissionsService>(SubmissionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMySubmissions (Security Check)', () => {
    it('should throw ForbiddenException if student has no groupId (403)', async () => {
      const req = { user: { role: 'Student', groupId: null } } as any;
      await expect(controller.getMySubmissions(req)).rejects.toThrow(ForbiddenException);
    });

    it('should return submissions if student has a valid groupId (Authorized)', async () => {
      const req = { user: { role: 'Student', groupId: 'group123' } } as any;
      mockSubmissionsService.findAll.mockResolvedValue([]);
      
      const result = await controller.getMySubmissions(req);
      
      expect(result).toEqual([]);
      expect(service.findAll).toHaveBeenCalledWith('group123');
    });
  });

  describe('create', () => {
    it('should authorize and create submission', async () => {
      const req = { user: { userId: 'student-1', role: 'Student' } };
      const dto = { title: 'Proposal', groupId: 'group-123', type: 'INITIAL', phaseId: 'phase-1' };
      const created = { _id: 'sub-1', ...dto };

      mockSubmissionsService.assertAuthorizedGroupMember.mockResolvedValue(undefined);
      mockSubmissionsService.createSubmission.mockResolvedValue(created);

      const result = await controller.create(req as any, dto);

      expect(service.assertAuthorizedGroupMember).toHaveBeenCalledWith(req.user, dto.groupId);
      expect(service.createSubmission).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });

    it('should throw ForbiddenException when authorization fails', async () => {
      const req = { user: { userId: 'student-1', role: 'Student' } };
      const dto = { title: 'Proposal', groupId: 'group-123', type: 'INITIAL', phaseId: 'phase-1' };

      mockSubmissionsService.assertAuthorizedGroupMember.mockRejectedValue(
        new ForbiddenException('You are not authorized to submit for this group.'),
      );

      await expect(controller.create(req as any, dto)).rejects.toThrow(ForbiddenException);
      expect(service.createSubmission).not.toHaveBeenCalled();
    });
  });

  describe('getCompleteness', () => {
    it('should return completeness data', async () => {
      const req = { user: { role: 'Coordinator' } };
      const completenessData = { submissionId: '64f1a2b3c4d5e6f7a8b9c0d1', isComplete: true, missingFields: [], requiredFields: ['title'], phaseId: 'phase-1' };
      mockSubmissionsService.getCompleteness.mockResolvedValue(completenessData);
      const result = await controller.getCompleteness(req as any, '64f1a2b3c4d5e6f7a8b9c0d1');
      expect(mockSubmissionsService.getCompleteness).toHaveBeenCalledWith('64f1a2b3c4d5e6f7a8b9c0d1');
      expect(result).toEqual(completenessData);
    });

    it('should throw BadRequestException for invalid ObjectId format', async () => {
      const req = { user: { role: 'Coordinator' } };
      await expect(controller.getCompleteness(req as any, 'invalid-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if Student tries to view another group completeness', async () => {
      const req = { user: { role: 'Student', groupId: 'my-group' } };
      const mockSubmission = { _id: '64f1a2b3c4d5e6f7a8b9c0d1', groupId: 'different-group' };
      mockSubmissionsService.findOne.mockResolvedValue(mockSubmission);
      await expect(controller.getCompleteness(req as any, '64f1a2b3c4d5e6f7a8b9c0d1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should allow Coordinator to fetch all submissions without groupId', async () => {
      const req = { user: { role: 'Coordinator' } };
      await controller.findAll(req as any);
      expect(service.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should throw BadRequestException if Student does not provide groupId', async () => {
      const req = { user: { role: 'Student' } };
      await expect(controller.findAll(req as any, undefined)).rejects.toThrow(ForbiddenException);
    });

    it('should allow Student to fetch their own group submissions', async () => {
      const req = { user: { role: 'Student', groupId: 'group-123' } };
      const groupId = 'group-123';
      await controller.findAll(req as any, groupId);
      expect(service.findAll).toHaveBeenCalledWith(groupId);
    });

    it('should throw ForbiddenException if Student tries to fetch another groups data', async () => {
      const req = { user: { role: 'Student', groupId: 'my-group-id' } };
      const maliciousGroupId = 'someone-elses-group-id';
      await expect(controller.findAll(req as any, maliciousGroupId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should throw BadRequestException for invalid ObjectId format', async () => {
      const req = { user: { role: 'Coordinator' } };
      const invalidId = '123';
      await expect(controller.findOne(req as any, invalidId)).rejects.toThrow(BadRequestException);
    });

    it('should allow viewing a submission if student belongs to the group', async () => {
      const req = { user: { role: 'Student', groupId: 'group-123' } };
      const mockSubmission = { _id: '64f1a2b3c4d5e6f7a8b9c0d1', groupId: 'group-123' };
      mockSubmissionsService.findOne.mockResolvedValue(mockSubmission);
      const result = await controller.findOne(req as any, mockSubmission._id);
      expect(result).toEqual(mockSubmission);
    });

    it('should throw ForbiddenException if Student tries to view another group\'s submission', async () => {
      const req = { user: { role: 'Student', groupId: 'group-123' } };
      const mockSubmission = { _id: '64f1a2b3c4d5e6f7a8b9c0d1', groupId: 'different-group' };
      mockSubmissionsService.findOne.mockResolvedValue(mockSubmission);
      await expect(controller.findOne(req as any, mockSubmission._id)).rejects.toThrow(ForbiddenException);
    });
  });
});