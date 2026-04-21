import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

describe('SubmissionsController', () => {
  let controller: SubmissionsController;
  let service: SubmissionsService;

  const mockSubmissionsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    uploadDocument: jest.fn(),
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
      
      await controller.findAll(req);
      
      // Verify that the service is called without parameters (undefined)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should throw BadRequestException if Student does not provide groupId', async () => {
      const req = { user: { role: 'Student' } }; 
      
     // Verify that it throws the error because GroupId is not given
      await expect(controller.findAll(req, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow Student to fetch their own group submissions', async () => {
      const req = { user: { role: 'Student', groupId: 'group-123' } }; 
      const groupId = 'group-123';
  
      await controller.findAll(req as any, groupId);
      expect(service.findAll).toHaveBeenCalledWith(groupId);
    });
  });
});