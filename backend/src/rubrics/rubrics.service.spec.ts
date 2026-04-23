import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { RubricsService } from './rubrics.service';
import { Rubric } from './schemas/rubric.schema';
import { DeliverablesService } from '../deliverables/deliverables.service';
import { CreateRubricDto } from './dto/create-rubric.dto';

describe('RubricsService', () => {
  let service: RubricsService;
  let mockRubricModel: any;
  let mockDeliverablesService: any;

  beforeEach(async () => {
    mockDeliverablesService = {
      findById: jest.fn().mockResolvedValue({
        deliverableId: 'deliverable-123',
        name: 'Proposal',
      }),
    };

    mockRubricModel = {
      startSession: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      updateMany: jest.fn(),
      deleteOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RubricsService,
        {
          provide: getModelToken(Rubric.name),
          useValue: mockRubricModel,
        },
        {
          provide: DeliverablesService,
          useValue: mockDeliverablesService,
        },
      ],
    }).compile();

    service = module.get<RubricsService>(RubricsService);
  });

  describe('createRubric', () => {
    it('should create a rubric and deactivate previous active rubric', async () => {
      const deliverableId = 'deliverable-123';
      const createDto: CreateRubricDto = {
        name: 'Test Rubric',
        questions: [
          { criteriaName: 'Quality', criteriaWeight: 0.5 },
          { criteriaName: 'Documentation', criteriaWeight: 0.5 },
        ],
      };

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      };

      mockRubricModel.startSession.mockResolvedValue(mockSession);
      mockRubricModel.updateMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      const mockNewRubric = {
        rubricId: 'rubric-123',
        deliverableId,
        name: createDto.name,
        isActive: true,
        questions: createDto.questions,
        save: jest.fn().mockResolvedValue({
          rubricId: 'rubric-123',
          deliverableId,
          name: createDto.name,
          isActive: true,
          questions: createDto.questions,
          toObject: jest.fn().mockReturnValue({
            rubricId: 'rubric-123',
            deliverableId,
            name: createDto.name,
            isActive: true,
            questions: createDto.questions,
          }),
        }),
      };

      mockRubricModel.constructor = jest.fn().mockReturnValue(mockNewRubric);

      const result = await service.createRubric(
        deliverableId,
        createDto,
        'user-123',
      );

      expect(mockDeliverablesService.findById).toHaveBeenCalledWith(
        deliverableId,
        'user-123',
      );
      expect(mockRubricModel.startSession).toHaveBeenCalled();
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(result.isActive).toBe(true);
    });

    it('should throw BadRequestException if criteria weight sum is not 1.0', async () => {
      const deliverableId = 'deliverable-123';
      const createDto: CreateRubricDto = {
        name: 'Test Rubric',
        questions: [
          { criteriaName: 'Quality', criteriaWeight: 0.3 },
          { criteriaName: 'Documentation', criteriaWeight: 0.5 },
        ],
      };

      await expect(
        service.createRubric(deliverableId, createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if deliverable does not exist', async () => {
      const deliverableId = 'invalid-deliverable';
      const createDto: CreateRubricDto = {
        name: 'Test Rubric',
        questions: [{ criteriaName: 'Quality', criteriaWeight: 1.0 }],
      };

      mockDeliverablesService.findById.mockRejectedValueOnce(
        new NotFoundException('Deliverable not found'),
      );

      await expect(
        service.createRubric(deliverableId, createDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listRubrics', () => {
    it('should return all rubrics for a deliverable', async () => {
      const deliverableId = 'deliverable-123';
      const mockRubrics = [
        {
          rubricId: 'rubric-1',
          deliverableId,
          name: 'Active Rubric',
          isActive: true,
          questions: [],
        },
        {
          rubricId: 'rubric-2',
          deliverableId,
          name: 'Old Rubric',
          isActive: false,
          questions: [],
        },
      ];

      mockRubricModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockRubrics),
          }),
        }),
      });

      const result = await service.listRubrics(deliverableId);

      expect(result).toEqual(mockRubrics);
      expect(result).toHaveLength(2);
    });

    it('should return only active rubric when activeOnly is true', async () => {
      const deliverableId = 'deliverable-123';
      const mockActiveRubric = [
        {
          rubricId: 'rubric-1',
          deliverableId,
          name: 'Active Rubric',
          isActive: true,
          questions: [],
        },
      ];

      mockRubricModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockActiveRubric),
          }),
        }),
      });

      const result = await service.listRubrics(deliverableId, true);

      expect(result).toEqual(mockActiveRubric);
      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException if deliverable does not exist', async () => {
      const deliverableId = 'invalid-deliverable';

      mockDeliverablesService.findById.mockRejectedValueOnce(
        new NotFoundException('Deliverable not found'),
      );

      await expect(service.listRubrics(deliverableId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteRubric', () => {
    it('should delete an unused rubric', async () => {
      const deliverableId = 'deliverable-123';
      const rubricId = 'rubric-123';

      mockRubricModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          rubricId,
          deliverableId,
          name: 'Test Rubric',
          isActive: false,
        }),
      });

      mockRubricModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      await service.deleteRubric(deliverableId, rubricId, 'user-123');

      expect(mockRubricModel.findOne).toHaveBeenCalledWith({
        rubricId,
        deliverableId,
      });
      expect(mockRubricModel.deleteOne).toHaveBeenCalledWith({ rubricId });
    });

    it('should throw NotFoundException if rubric does not exist', async () => {
      const deliverableId = 'deliverable-123';
      const rubricId = 'invalid-rubric';

      mockRubricModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.deleteRubric(deliverableId, rubricId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if deliverable does not exist', async () => {
      const deliverableId = 'invalid-deliverable';
      const rubricId = 'rubric-123';

      mockDeliverablesService.findById.mockRejectedValueOnce(
        new NotFoundException('Deliverable not found'),
      );

      await expect(
        service.deleteRubric(deliverableId, rubricId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
