import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RubricsController } from './rubrics.controller';
import { RubricsService } from './rubrics.service';
import { CreateRubricDto } from './dto/create-rubric.dto';

describe('RubricsController', () => {
  let controller: RubricsController;
  let mockRubricsService: any;

  beforeEach(async () => {
    mockRubricsService = {
      createRubric: jest.fn(),
      listRubrics: jest.fn(),
      deleteRubric: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RubricsController],
      providers: [
        {
          provide: RubricsService,
          useValue: mockRubricsService,
        },
      ],
    }).compile();

    controller = module.get<RubricsController>(RubricsController);
  });

  describe('listRubrics', () => {
    it('should return rubrics array', async () => {
      const deliverableId = 'deliverable-123';
      const mockRubrics = [
        {
          rubricId: 'rubric-1',
          deliverableId,
          name: 'Test Rubric',
          isActive: true,
          questions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRubricsService.listRubrics.mockResolvedValue(mockRubrics);

      const mockRequest = {
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          role: 'Coordinator',
        },
      };

      const result = await controller.listRubrics(
        deliverableId,
        { activeOnly: false },
        mockRequest as any,
      );

      expect(result).toEqual(mockRubrics);
      expect(mockRubricsService.listRubrics).toHaveBeenCalledWith(
        deliverableId,
        false,
        'user-123',
      );
    });

    it('should return 404 when deliverable not found', async () => {
      const deliverableId = 'invalid-deliverable';

      mockRubricsService.listRubrics.mockRejectedValueOnce(
        new NotFoundException('Deliverable not found'),
      );

      const mockRequest = {
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          role: 'Coordinator',
        },
      };

      await expect(
        controller.listRubrics(
          deliverableId,
          { activeOnly: false },
          mockRequest as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createRubric', () => {
    it('should create rubric and return 201', async () => {
      const deliverableId = 'deliverable-123';
      const createDto: CreateRubricDto = {
        name: 'Test Rubric',
        questions: [{ criteriaName: 'Quality', criteriaWeight: 1.0 }],
      };

      const mockCreatedRubric = {
        rubricId: 'rubric-123',
        deliverableId,
        name: createDto.name,
        isActive: true,
        questions: createDto.questions,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRubricsService.createRubric.mockResolvedValue(mockCreatedRubric);

      const mockRequest = {
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          role: 'Coordinator',
        },
      };

      const result = await controller.createRubric(
        deliverableId,
        createDto,
        mockRequest as any,
      );

      expect(result).toEqual(mockCreatedRubric);
      expect(result.isActive).toBe(true);
      expect(mockRubricsService.createRubric).toHaveBeenCalledWith(
        deliverableId,
        createDto,
        'user-123',
      );
    });

    it('should return 400 when criteria weight sum is invalid', async () => {
      const deliverableId = 'deliverable-123';
      const createDto: CreateRubricDto = {
        name: 'Test Rubric',
        questions: [{ criteriaName: 'Quality', criteriaWeight: 0.5 }],
      };

      mockRubricsService.createRubric.mockRejectedValueOnce(
        new BadRequestException('Criteria weights must sum to exactly 1.0'),
      );

      const mockRequest = {
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          role: 'Coordinator',
        },
      };

      await expect(
        controller.createRubric(deliverableId, createDto, mockRequest as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return 404 when deliverable not found', async () => {
      const deliverableId = 'invalid-deliverable';
      const createDto: CreateRubricDto = {
        name: 'Test Rubric',
        questions: [{ criteriaName: 'Quality', criteriaWeight: 1.0 }],
      };

      mockRubricsService.createRubric.mockRejectedValueOnce(
        new NotFoundException('Deliverable not found'),
      );

      const mockRequest = {
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          role: 'Coordinator',
        },
      };

      await expect(
        controller.createRubric(deliverableId, createDto, mockRequest as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteRubric', () => {
    it('should delete rubric and return 204', async () => {
      const deliverableId = 'deliverable-123';
      const rubricId = 'rubric-123';

      mockRubricsService.deleteRubric.mockResolvedValue(undefined);

      const mockRequest = {
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          role: 'Coordinator',
        },
      };

      await controller.deleteRubric(
        deliverableId,
        rubricId,
        mockRequest as any,
      );

      expect(mockRubricsService.deleteRubric).toHaveBeenCalledWith(
        deliverableId,
        rubricId,
        'user-123',
      );
    });

    it('should return 404 when rubric not found', async () => {
      const deliverableId = 'deliverable-123';
      const rubricId = 'invalid-rubric';

      mockRubricsService.deleteRubric.mockRejectedValueOnce(
        new NotFoundException('Rubric not found'),
      );

      const mockRequest = {
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          role: 'Coordinator',
        },
      };

      await expect(
        controller.deleteRubric(deliverableId, rubricId, mockRequest as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
