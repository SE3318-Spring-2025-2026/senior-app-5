import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { SprintConfigsService } from './sprint-configs.service';
import { SprintConfigEntry } from './schemas/sprint-config.schema';
import { Deliverable } from '../deliverables/schemas/deliverable.schema';
import { Schedule } from '../advisors/schemas/schedule.schema';

// ─── Mock data ──────────────────────────────────────────────────────────────
const SPRINT_ID = '11111111-1111-4111-8111-111111111111';
const DELIVERABLE_ID_1 = '22222222-2222-4222-8222-222222222221';
const DELIVERABLE_ID_2 = '22222222-2222-4222-8222-222222222222';

const makeDoc = (overrides: Record<string, unknown> = {}) => ({
  sprintId: SPRINT_ID,
  targetStoryPoints: 40,
  deliverableMappings: [
    { deliverableId: DELIVERABLE_ID_1, contributionPercentage: 30 },
  ],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  save: jest.fn().mockImplementation(function (this: unknown) {
    return Promise.resolve(this);
  }),
  ...overrides,
});

// ─── Mock models ────────────────────────────────────────────────────────────
const mockSprintConfigModel = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
};

const mockDeliverableModel = {
  find: jest.fn(),
};

const mockScheduleModel = {
  findOne: jest.fn(),
};

// ─── Suite ──────────────────────────────────────────────────────────────────
describe('SprintConfigsService', () => {
  let service: SprintConfigsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SprintConfigsService,
        {
          provide: getModelToken(SprintConfigEntry.name),
          useValue: mockSprintConfigModel,
        },
        {
          provide: getModelToken(Deliverable.name),
          useValue: mockDeliverableModel,
        },
        {
          provide: getModelToken(Schedule.name),
          useValue: mockScheduleModel,
        },
      ],
    }).compile();

    service = module.get(SprintConfigsService);
  });

  // ── Shared happy-path helpers ───────────────────────────────────────────
  const setupHappyPathCreate = () => {
    // sprintId exists in Schedule
    mockScheduleModel.findOne.mockReturnValue({
      lean: () => ({ exec: () => Promise.resolve({ scheduleId: SPRINT_ID }) }),
    });
    // deliverable exists
    mockDeliverableModel.find.mockReturnValue({
      select: () => ({
        lean: () => ({
          exec: () =>
            Promise.resolve([{ deliverableId: DELIVERABLE_ID_1 }]),
        }),
      }),
    });
    // no existing config (no conflict)
    mockSprintConfigModel.findOne.mockReturnValue({
      lean: () => ({ exec: () => Promise.resolve(null) }),
    });
    // no existing configs for % sum check
    mockSprintConfigModel.find.mockReturnValue({
      select: () => ({
        lean: () => ({ exec: () => Promise.resolve([]) }),
      }),
    });
  };

  // ── create ─────────────────────────────────────────────────────────────
  describe('create', () => {
    const dto = {
      sprintId: SPRINT_ID,
      targetStoryPoints: 40,
      deliverableMappings: [
        { deliverableId: DELIVERABLE_ID_1, contributionPercentage: 30 },
      ],
    };

    it('creates and returns a sprint config on happy path', async () => {
      setupHappyPathCreate();
      const doc = makeDoc();
      mockSprintConfigModel.create.mockResolvedValue(doc);

      const result = await service.create(dto);

      expect(result.sprintId).toBe(SPRINT_ID);
      expect(result.targetStoryPoints).toBe(40);
      expect(result.deliverableMappings).toHaveLength(1);
    });

    it('throws 400 when sprintId not found in Schedule', async () => {
      // deliverableIds pass (checked first per spec)
      mockDeliverableModel.find.mockReturnValue({
        select: () => ({
          lean: () => ({
            exec: () => Promise.resolve([{ deliverableId: DELIVERABLE_ID_1 }]),
          }),
        }),
      });
      // sprintId not found in Schedule
      mockScheduleModel.findOne.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve(null) }),
      });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws 400 when a deliverableId does not exist in D1', async () => {
      mockScheduleModel.findOne.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve({ scheduleId: SPRINT_ID }) }),
      });
      // no deliverables found
      mockDeliverableModel.find.mockReturnValue({
        select: () => ({
          lean: () => ({ exec: () => Promise.resolve([]) }),
        }),
      });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws 409 when a config for the sprintId already exists', async () => {
      mockScheduleModel.findOne.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve({ scheduleId: SPRINT_ID }) }),
      });
      mockDeliverableModel.find.mockReturnValue({
        select: () => ({
          lean: () => ({
            exec: () => Promise.resolve([{ deliverableId: DELIVERABLE_ID_1 }]),
          }),
        }),
      });
      // existing config found → 409
      mockSprintConfigModel.findOne.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve({ sprintId: SPRINT_ID }) }),
      });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('throws 422 when contribution percentage sum exceeds 100', async () => {
      mockScheduleModel.findOne.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve({ scheduleId: SPRINT_ID }) }),
      });
      mockDeliverableModel.find.mockReturnValue({
        select: () => ({
          lean: () => ({
            exec: () => Promise.resolve([{ deliverableId: DELIVERABLE_ID_1 }]),
          }),
        }),
      });
      mockSprintConfigModel.findOne.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve(null) }),
      });
      // existing configs already have 80% for this deliverable
      mockSprintConfigModel.find.mockReturnValue({
        select: () => ({
          lean: () => ({
            exec: () =>
              Promise.resolve([
                {
                  deliverableMappings: [
                    { deliverableId: DELIVERABLE_ID_1, contributionPercentage: 80 },
                  ],
                },
              ]),
          }),
        }),
      });

      await expect(service.create(dto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  // ── update ─────────────────────────────────────────────────────────────
  describe('update', () => {
    const updateDto = {
      targetStoryPoints: 50,
      deliverableMappings: [
        { deliverableId: DELIVERABLE_ID_1, contributionPercentage: 25 },
      ],
    };

    it('updates and returns the sprint config on happy path', async () => {
      const doc = makeDoc();
      mockSprintConfigModel.findOne.mockReturnValue({
        exec: () => Promise.resolve(doc),
      });
      mockDeliverableModel.find.mockReturnValue({
        select: () => ({
          lean: () => ({
            exec: () => Promise.resolve([{ deliverableId: DELIVERABLE_ID_1 }]),
          }),
        }),
      });
      mockSprintConfigModel.find.mockReturnValue({
        select: () => ({
          lean: () => ({ exec: () => Promise.resolve([]) }),
        }),
      });

      const result = await service.update(SPRINT_ID, updateDto);

      expect(result.sprintId).toBe(SPRINT_ID);
      expect(doc.save).toHaveBeenCalled();
    });

    it('throws 404 when config not found', async () => {
      mockSprintConfigModel.findOne.mockReturnValue({
        exec: () => Promise.resolve(null),
      });

      await expect(service.update(SPRINT_ID, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws 400 when updated deliverableId does not exist in D1', async () => {
      const doc = makeDoc();
      mockSprintConfigModel.findOne.mockReturnValue({
        exec: () => Promise.resolve(doc),
      });
      mockDeliverableModel.find.mockReturnValue({
        select: () => ({
          lean: () => ({ exec: () => Promise.resolve([]) }),
        }),
      });

      await expect(service.update(SPRINT_ID, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws 422 when updated percentage sum exceeds 100', async () => {
      const doc = makeDoc();
      mockSprintConfigModel.findOne.mockReturnValue({
        exec: () => Promise.resolve(doc),
      });
      mockDeliverableModel.find.mockReturnValue({
        select: () => ({
          lean: () => ({
            exec: () => Promise.resolve([{ deliverableId: DELIVERABLE_ID_1 }]),
          }),
        }),
      });
      // OTHER configs already have 80% for the same deliverable
      mockSprintConfigModel.find.mockReturnValue({
        select: () => ({
          lean: () => ({
            exec: () =>
              Promise.resolve([
                {
                  deliverableMappings: [
                    { deliverableId: DELIVERABLE_ID_1, contributionPercentage: 80 },
                  ],
                },
              ]),
          }),
        }),
      });

      await expect(service.update(SPRINT_ID, updateDto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('updates only targetStoryPoints when deliverableMappings are not provided', async () => {
      const doc = makeDoc();
      mockSprintConfigModel.findOne.mockReturnValue({
        exec: () => Promise.resolve(doc),
      });

      const result = await service.update(SPRINT_ID, { targetStoryPoints: 99 });

      expect(result.targetStoryPoints).toBe(99);
      expect(doc.save).toHaveBeenCalled();
      // deliverableModel.find should NOT be called when no mappings in dto
      expect(mockDeliverableModel.find).not.toHaveBeenCalled();
    });
  });
});
