import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CommitteesService } from './committees.service';
import { Committee } from './schemas/committee.schema';

describe('CommitteesService', () => {
  let service: CommitteesService;

  const mockCommitteeModel = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommitteesService,
        {
          provide: getModelToken(Committee.name),
          useValue: mockCommitteeModel,
        },
      ],
    }).compile();

    service = module.get<CommitteesService>(CommitteesService);
    jest.clearAllMocks();
  });

  it('returns paginated jury members for a valid committee', async () => {
    const exec = jest.fn().mockResolvedValue({
      committeeId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'Committee A',
      juryMembers: [
        {
          userId: 'user-1',
          assignedAt: new Date('2026-04-16T10:00:00.000Z'),
        },
        {
          userId: 'user-2',
          assignedAt: new Date('2026-04-16T11:00:00.000Z'),
        },
      ],
    });

    const lean = jest.fn().mockReturnValue({ exec });
    mockCommitteeModel.findOne.mockReturnValue({ lean });

    const result = await service.listJuryMembers(
      '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      1,
      20,
      'Coordinator',
      'corr-1',
    );

    expect(result).toEqual({
      data: [
        {
          userId: 'user-1',
          assignedAt: new Date('2026-04-16T10:00:00.000Z'),
        },
        {
          userId: 'user-2',
          assignedAt: new Date('2026-04-16T11:00:00.000Z'),
        },
      ],
      total: 2,
      page: 1,
      limit: 20,
    });
    expect(mockCommitteeModel.findOne).toHaveBeenCalledWith({
      committeeId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    });
  });

  it('returns empty page when committee exists but has no jury members', async () => {
    const exec = jest.fn().mockResolvedValue({
      committeeId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'Committee A',
      juryMembers: [],
    });

    const lean = jest.fn().mockReturnValue({ exec });
    mockCommitteeModel.findOne.mockReturnValue({ lean });

    const result = await service.listJuryMembers(
      '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      1,
      20,
      'Coordinator',
    );

    expect(result).toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });
  });

  it('throws 404 when committee does not exist', async () => {
    const exec = jest.fn().mockResolvedValue(null);
    const lean = jest.fn().mockReturnValue({ exec });
    mockCommitteeModel.findOne.mockReturnValue({ lean });

    await expect(
      service.listJuryMembers(
        '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        1,
        20,
        'Coordinator',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps repository failure to 500', async () => {
    const exec = jest.fn().mockRejectedValue(new Error('db exploded'));
    const lean = jest.fn().mockReturnValue({ exec });
    mockCommitteeModel.findOne.mockReturnValue({ lean });

    await expect(
      service.listJuryMembers(
        '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        1,
        20,
        'Coordinator',
      ),
    ).rejects.toThrow(InternalServerErrorException);
  });
});