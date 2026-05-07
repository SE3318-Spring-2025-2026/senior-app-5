import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { RubricsService } from './rubrics.service';
import { Rubric } from './schemas/rubric.schema';

describe('RubricsService', () => {
  let service: RubricsService;

  const session = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
    inTransaction: jest.fn().mockReturnValue(true),
  };

  const mockConnection = {
    startSession: jest.fn().mockResolvedValue(session),
  };

  const mockRubricModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RubricsService,
        {
          provide: getModelToken(Rubric.name),
          useValue: mockRubricModel,
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get(RubricsService);
  });

  it('lists rubrics for a deliverable', async () => {
    const createdAt = new Date('2026-05-01T10:00:00.000Z');
    const updatedAt = new Date('2026-05-02T10:00:00.000Z');

    mockRubricModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([
                {
                  rubricId: '44444444-4444-4444-8444-444444444441',
                  deliverableId: '33333333-3333-4333-8333-333333333333',
                  name: 'Sprint 1 SCRUM Rubric',
                  isActive: true,
                  questions: [
                    {
                      questionId: '55555555-5555-4555-8555-555555555551',
                      criteriaName: 'Team planning quality',
                      criteriaWeight: 0.4,
                    },
                  ],
                  createdAt,
                  updatedAt,
                },
              ]),
            }),
          }),
        }),
      }),
    });
    mockRubricModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });

    const result = await service.listRubrics(
      '33333333-3333-4333-8333-333333333333',
      { page: 1, limit: 20 },
    );

    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Sprint 1 SCRUM Rubric');
  });

  it('creates a rubric and deactivates the previous active rubric', async () => {
    mockRubricModel.updateMany.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ acknowledged: true }),
    });
    mockRubricModel.create.mockResolvedValue([
      {
        rubricId: '44444444-4444-4444-8444-444444444441',
        deliverableId: '33333333-3333-4333-8333-333333333333',
        name: 'Sprint 1 SCRUM Rubric',
        isActive: true,
        questions: [
          {
            questionId: '55555555-5555-4555-8555-555555555551',
            criteriaName: 'Team planning quality',
            criteriaWeight: 0.4,
          },
          {
            questionId: '55555555-5555-4555-8555-555555555552',
            criteriaName: 'Sprint execution quality',
            criteriaWeight: 0.6,
          },
        ],
        toObject: () => ({
          rubricId: '44444444-4444-4444-8444-444444444441',
          deliverableId: '33333333-3333-4333-8333-333333333333',
          name: 'Sprint 1 SCRUM Rubric',
          isActive: true,
          questions: [
            {
              questionId: '55555555-5555-4555-8555-555555555551',
              criteriaName: 'Team planning quality',
              criteriaWeight: 0.4,
            },
            {
              questionId: '55555555-5555-4555-8555-555555555552',
              criteriaName: 'Sprint execution quality',
              criteriaWeight: 0.6,
            },
          ],
          createdAt: new Date('2026-05-03T10:00:00.000Z'),
          updatedAt: new Date('2026-05-03T10:00:00.000Z'),
        }),
      },
    ]);

    const result = await service.createRubric(
      {
        deliverableId: '33333333-3333-4333-8333-333333333333',
        name: 'Sprint 1 SCRUM Rubric',
        questions: [
          {
            criteriaName: 'Team planning quality',
            criteriaWeight: 0.4,
          },
          {
            criteriaName: 'Sprint execution quality',
            criteriaWeight: 0.6,
          },
        ],
      },
      'coord-1',
    );

    expect(result.rubricId).toBe('44444444-4444-4444-8444-444444444441');
    expect(session.commitTransaction).toHaveBeenCalled();
    expect(mockRubricModel.updateMany).toHaveBeenCalled();
  });

  it('rejects create when weights do not sum to 1', async () => {
    await expect(
      service.createRubric(
        {
          deliverableId: '33333333-3333-4333-8333-333333333333',
          name: 'Bad Rubric',
          questions: [
            {
              criteriaName: 'Team planning quality',
              criteriaWeight: 0.7,
            },
            {
              criteriaName: 'Sprint execution quality',
              criteriaWeight: 0.7,
            },
          ],
        },
        'coord-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns null when active rubric is missing', async () => {
    mockRubricModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.getActiveRubric('33333333-3333-4333-8333-333333333333'),
    ).resolves.toBeNull();
  });

  it('deletes a rubric by id', async () => {
    mockRubricModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ rubricId: 'rubric-1' }),
    });
    mockRubricModel.deleteOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    });

    await expect(service.deleteRubric('rubric-1')).resolves.toBeUndefined();
    expect(mockRubricModel.deleteOne).toHaveBeenCalledWith({
      rubricId: 'rubric-1',
    });
  });

  it('throws not found when deleting a missing rubric', async () => {
    mockRubricModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(service.deleteRubric('rubric-missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('maps unexpected errors to 500', async () => {
    mockConnection.startSession.mockRejectedValueOnce(new Error('boom'));

    await expect(
      service.createRubric(
        {
          deliverableId: '33333333-3333-4333-8333-333333333333',
          name: 'Sprint 1 SCRUM Rubric',
          questions: [
            {
              criteriaName: 'Team planning quality',
              criteriaWeight: 0.4,
            },
            {
              criteriaName: 'Sprint execution quality',
              criteriaWeight: 0.6,
            },
          ],
        },
        'coord-1',
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});