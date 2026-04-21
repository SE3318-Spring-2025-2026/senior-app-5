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

  describe('findAll', () => {
    it('should allow Coordinator to fetch all submissions without groupId', async () => {
      const req = { user: { role: 'Coordinator' } };

      await controller.findAll(req as any);
      
      expect(service.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should throw BadRequestException if Student does not provide groupId', async () => {
      const req = { user: { role: 'Student' } }; 
      
      await expect(controller.findAll(req as any, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow Student to fetch their own group submissions', async () => {
      const req = { user: { role: 'Student', groupId: 'group-123' } }; 
      const groupId = 'group-123';
      
      await controller.findAll(req as any, groupId);
      
      expect(service.findAll).toHaveBeenCalledWith(groupId);
    });

    // SECURITY TEST: Student trying to retrieve someone else's data
    it('should throw ForbiddenException if Student tries to fetch another groups data', async () => {
      const req = { user: { role: 'Student', groupId: 'my-group-id' } };
      const maliciousGroupId = 'someone-elses-group-id';
      
      await expect(controller.findAll(req as any, maliciousGroupId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findOne', () => {
    it('should throw BadRequestException for invalid ObjectId format', async () => {
      const req = { user: { role: 'Coordinator' } };
      const invalidId = '123'; // Not a valid MongoDB ObjectId (24 hex characters)
      
      await expect(controller.findOne(req as any, invalidId)).rejects.toThrow(
        BadRequestException,
      );
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

      await expect(controller.findOne(req as any, mockSubmission._id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});