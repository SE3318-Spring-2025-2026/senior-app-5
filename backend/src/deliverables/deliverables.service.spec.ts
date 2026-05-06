import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { DeliverablesService } from './deliverables.service';
import { Deliverable } from './schemas/deliverable.schema';

describe('DeliverablesService', () => {
  let service: DeliverablesService;

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

  const mockDeliverableModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliverablesService,
        {
          provide: getModelToken(Deliverable.name),
          useValue: mockDeliverableModel,
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get(DeliverablesService);
  });

  it('lists deliverables with pagination', async () => {
    const createdAt = new Date('2026-05-01T10:00:00.000Z');
    const updatedAt = new Date('2026-05-02T10:00:00.000Z');

    mockDeliverableModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([
                {
                  deliverableId: '11111111-1111-4111-8111-111111111111',
                  name: 'SoW',
                  categoryWeight: 0.5,
                  subWeight: 0.35,
                  deliverablePercentage: 17.5,
                  createdAt,
                  updatedAt,
                },
              ]),
            }),
          }),
        }),
      }),
    });
    mockDeliverableModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });

    const result = await service.listDeliverables({ page: 1, limit: 20 });

    expect(result.total).toBe(1);
    expect(result.data[0].name).toBe('SoW');
  });

  it('creates a deliverable', async () => {
    mockDeliverableModel.findOne.mockReturnValue({
      session: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      }),
    });
    mockDeliverableModel.find.mockReturnValue({
      session: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    const createdAt = new Date('2026-05-03T10:00:00.000Z');
    const updatedAt = new Date('2026-05-03T10:00:00.000Z');
    mockDeliverableModel.create.mockResolvedValue([
      {
        deliverableId: '22222222-2222-4222-8222-222222222222',
        name: 'SoW',
        categoryWeight: 0.5,
        subWeight: 0.35,
        deliverablePercentage: 17.5,
        toObject: () => ({
          deliverableId: '22222222-2222-4222-8222-222222222222',
          name: 'SoW',
          categoryWeight: 0.5,
          subWeight: 0.35,
          deliverablePercentage: 17.5,
          createdAt,
          updatedAt,
        }),
      },
    ]);

    const result = await service.createDeliverable(
      {
        name: 'SoW',
        categoryWeight: 0.5,
        subWeight: 0.35,
        deliverablePercentage: 17.5,
      },
      'coord-1',
    );

    expect(result.deliverableId).toBe('22222222-2222-4222-8222-222222222222');
    expect(session.commitTransaction).toHaveBeenCalled();
  });

  it('rejects duplicate names on create', async () => {
    mockDeliverableModel.findOne.mockReturnValue({
      session: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            deliverableId: 'existing-id',
            name: 'SoW',
          }),
        }),
      }),
    });

    await expect(
      service.createDeliverable(
        {
          name: 'SoW',
          categoryWeight: 0.5,
          subWeight: 0.35,
          deliverablePercentage: 17.5,
        },
        'coord-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects percentage total above 100 on create', async () => {
    mockDeliverableModel.findOne.mockReturnValue({
      session: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      }),
    });
    mockDeliverableModel.find.mockReturnValue({
      session: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            { deliverablePercentage: 90 },
          ]),
        }),
      }),
    });

    await expect(
      service.createDeliverable(
        {
          name: 'SoW',
          categoryWeight: 0.5,
          subWeight: 0.35,
          deliverablePercentage: 17.5,
        },
        'coord-1',
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('updates a deliverable', async () => {
    const existing = {
      deliverableId: '33333333-3333-4333-8333-333333333333',
      name: 'SoW',
      categoryWeight: 0.5,
      subWeight: 0.35,
      deliverablePercentage: 17.5,
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-02T10:00:00.000Z'),
      save: jest.fn().mockResolvedValue(undefined),
      toObject: function () {
        return this;
      },
    };

    mockDeliverableModel.findOne.mockReturnValueOnce({
      session: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      }),
    });
    mockDeliverableModel.find.mockReturnValue({
      session: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            { deliverablePercentage: 20 },
          ]),
        }),
      }),
    });

    const result = await service.updateDeliverable(
      existing.deliverableId,
      { deliverablePercentage: 25 },
      'coord-1',
    );

    expect(result.deliverablePercentage).toBe(25);
    expect(existing.save).toHaveBeenCalled();
  });

  it('throws not found for missing deliverable on update', async () => {
    mockDeliverableModel.findOne.mockReturnValue({
      session: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(
      service.updateDeliverable(
        '44444444-4444-4444-8444-444444444444',
        { deliverablePercentage: 10 },
        'coord-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps unexpected errors to 500', async () => {
    mockConnection.startSession.mockRejectedValueOnce(new Error('boom'));

    await expect(
      service.createDeliverable(
        {
          name: 'SoW',
          categoryWeight: 0.5,
          subWeight: 0.35,
          deliverablePercentage: 17.5,
        },
        'coord-1',
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
