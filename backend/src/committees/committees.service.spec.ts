import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { InternalServerErrorException } from '@nestjs/common';
import { CommitteesService } from './committees.service';
import { Committee } from './schemas/committee.schema';

describe('CommitteesService', () => {
  let service: CommitteesService;
  let mockCommitteeModel: { create: jest.Mock };

  const mockCommittee = {
    id: 'test-uuid',
    name: 'Test Committee',
    jury: [],
    advisors: [],
    groups: [],
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: null,
  };

  beforeEach(async () => {
    mockCommitteeModel = {
      create: jest.fn(),
    };

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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCommittee', () => {
    it('happy path: valid name → returns created committee', async () => {
      mockCommitteeModel.create.mockResolvedValue(mockCommittee);

      const result = await service.createCommittee(
        { name: 'Test Committee' },
        'coordinator-123',
        'corr-abc',
      );

      expect(mockCommitteeModel.create).toHaveBeenCalledWith({
        name: 'Test Committee',
        jury: [],
        advisors: [],
        groups: [],
      });
      expect(result.id).toBe('test-uuid');
      expect(result.name).toBe('Test Committee');
      expect(result.jury).toEqual([]);
      expect(result.advisors).toEqual([]);
      expect(result.groups).toEqual([]);
    });

    it('should set jury, advisors, groups as empty arrays on creation', async () => {
      mockCommitteeModel.create.mockResolvedValue(mockCommittee);

      const result = await service.createCommittee(
        { name: 'Another Committee' },
        'coordinator-456',
      );

      expect(result.jury).toEqual([]);
      expect(result.advisors).toEqual([]);
      expect(result.groups).toEqual([]);
    });

    it('failure: repository throws → throws InternalServerErrorException (500)', async () => {
      mockCommitteeModel.create.mockRejectedValue(
        new Error('DB connection lost'),
      );

      await expect(
        service.createCommittee({ name: 'Test Committee' }, 'coordinator-123'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('failure: repository throws → error message is generic to caller', async () => {
      mockCommitteeModel.create.mockRejectedValue(
        new Error('DB connection lost'),
      );

      await expect(
        service.createCommittee({ name: 'Test Committee' }, 'coordinator-123'),
      ).rejects.toThrow(
        'Failed to create committee due to an unexpected error.',
      );
    });
  });
});
