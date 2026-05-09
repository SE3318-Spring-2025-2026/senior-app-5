import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SprintConfigsController } from './sprint-configs.controller';
import { SprintConfigsService } from './sprint-configs.service';
import { CreateSprintConfigDto } from './dto/create-sprint-config.dto';
import { UpdateSprintConfigDto } from './dto/update-sprint-config.dto';
import { SprintConfigResponseDto } from './dto/sprint-config-response.dto';

const SPRINT_ID = '11111111-1111-4111-8111-111111111111';
const DELIVERABLE_ID = '22222222-2222-4222-8222-222222222221';

const mockResponse: SprintConfigResponseDto = {
  sprintId: SPRINT_ID,
  targetStoryPoints: 40,
  deliverableMappings: [
    { deliverableId: DELIVERABLE_ID, contributionPercentage: 30 },
  ],
  isFinalized: false,
  name: null,
  startDate: null,
  endDate: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockService = {
  create: jest.fn(),
  update: jest.fn(),
};

describe('SprintConfigsController', () => {
  let controller: SprintConfigsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SprintConfigsController],
      providers: [{ provide: SprintConfigsService, useValue: mockService }],
    }).compile();

    controller = module.get(SprintConfigsController);
  });

  // ── POST / ──────────────────────────────────────────────────────────────
  describe('createSprintConfig', () => {
    const dto: CreateSprintConfigDto = {
      sprintId: SPRINT_ID,
      targetStoryPoints: 40,
      deliverableMappings: [
        { deliverableId: DELIVERABLE_ID, contributionPercentage: 30 },
      ],
    };

    it('returns 201 response from service on success', async () => {
      mockService.create.mockResolvedValue(mockResponse);

      const result = await controller.createSprintConfig(dto);

      expect(result).toEqual(mockResponse);
      expect(mockService.create).toHaveBeenCalledWith(dto);
    });

    it('propagates BadRequestException from service', async () => {
      mockService.create.mockRejectedValue(
        new BadRequestException('sprintId not found'),
      );

      await expect(controller.createSprintConfig(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('propagates ConflictException from service', async () => {
      mockService.create.mockRejectedValue(
        new ConflictException('already exists'),
      );

      await expect(controller.createSprintConfig(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('propagates UnprocessableEntityException from service', async () => {
      mockService.create.mockRejectedValue(
        new UnprocessableEntityException('percentage > 100'),
      );

      await expect(controller.createSprintConfig(dto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('propagates UnauthorizedException as 401', async () => {
      mockService.create.mockRejectedValue(new UnauthorizedException());

      await expect(controller.createSprintConfig(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('propagates ForbiddenException as 403', async () => {
      mockService.create.mockRejectedValue(new ForbiddenException());

      await expect(controller.createSprintConfig(dto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── PATCH /:sprintId ─────────────────────────────────────────────────
  describe('updateSprintConfig', () => {
    const dto: UpdateSprintConfigDto = { targetStoryPoints: 50 };

    it('returns 200 response from service on success', async () => {
      mockService.update.mockResolvedValue(mockResponse);

      const result = await controller.updateSprintConfig(SPRINT_ID, dto);

      expect(result).toEqual(mockResponse);
      expect(mockService.update).toHaveBeenCalledWith(SPRINT_ID, dto);
    });

    it('propagates NotFoundException from service', async () => {
      mockService.update.mockRejectedValue(new NotFoundException('not found'));

      await expect(
        controller.updateSprintConfig(SPRINT_ID, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('propagates UnprocessableEntityException from service', async () => {
      mockService.update.mockRejectedValue(
        new UnprocessableEntityException('percentage > 100'),
      );

      await expect(
        controller.updateSprintConfig(SPRINT_ID, dto),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
