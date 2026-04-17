import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CommitteesService } from './committees.service';
import { Committee } from './schemas/committee.schema';
import { UsersService } from '../users/users.service';

describe('CommitteesService', () => {
  let service: CommitteesService;

  const mockCommitteeModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const mockUsersService = {
    findByIdAndRole: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommitteesService,
        {
          provide: getModelToken(Committee.name),
          useValue: mockCommitteeModel,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
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

  // Tests for addAdvisor
  describe('addAdvisor', () => {
    const committeeId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    const advisorUserId = 'advisor-user-id-1234';
    const coordinatorId = 'coordinator-user-id-5678';

    it('successfully links an advisor to a committee with provided assignedAt', async () => {
      const assignedAtDate = new Date('2026-04-17T10:30:00.000Z');

      const execFindOne = jest
        .fn()
        .mockResolvedValue({
          committeeId,
          name: 'Committee A',
          advisorId: null,
        });

      const leanFindOne = jest.fn().mockReturnValue({ exec: execFindOne });
      mockCommitteeModel.findOne.mockReturnValueOnce({
        lean: leanFindOne,
        exec: execFindOne,
      });

      const execFindOneAndUpdate = jest
        .fn()
        .mockResolvedValue({
          committeeId,
          name: 'Committee A',
          advisorId: advisorUserId,
          advisorAssignedAt: assignedAtDate,
          advisorAssignedBy: coordinatorId,
        });

      mockCommitteeModel.findOneAndUpdate.mockReturnValue({
        exec: execFindOneAndUpdate,
      });

      mockUsersService.findByIdAndRole.mockResolvedValue({
        _id: advisorUserId,
        email: 'advisor@example.com',
        role: 'Professor',
      });

      const result = await service.addAdvisor(
        committeeId,
        advisorUserId,
        assignedAtDate,
        coordinatorId,
        'corr-1',
      );

      expect(result).toEqual({
        advisorUserId,
        assignedAt: assignedAtDate,
        assignedByUserId: coordinatorId,
      });
      expect(mockUsersService.findByIdAndRole).toHaveBeenCalledWith(
        advisorUserId,
        'Professor',
      );
    });

    it('successfully links an advisor with default server time if assignedAt not provided', async () => {
      const now = new Date();
      const execFindOne = jest
        .fn()
        .mockResolvedValue({
          committeeId,
          name: 'Committee A',
          advisorId: null,
        });

      mockCommitteeModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: execFindOne }),
        exec: execFindOne,
      });

      const execFindOneAndUpdate = jest
        .fn()
        .mockResolvedValue({
          committeeId,
          name: 'Committee A',
          advisorId: advisorUserId,
          advisorAssignedBy: coordinatorId,
        });

      mockCommitteeModel.findOneAndUpdate.mockReturnValue({
        exec: execFindOneAndUpdate,
      });

      mockUsersService.findByIdAndRole.mockResolvedValue({
        _id: advisorUserId,
        email: 'advisor@example.com',
        role: 'Professor',
      });

      const result = await service.addAdvisor(
        committeeId,
        advisorUserId,
        undefined,
        coordinatorId,
      );

      expect(result.advisorUserId).toEqual(advisorUserId);
      expect(result.assignedByUserId).toEqual(coordinatorId);
      expect(result.assignedAt).toBeDefined();
      expect(result.assignedAt.getTime()).toBeGreaterThanOrEqual(
        now.getTime(),
      );
    });

    it('throws 409 Conflict when advisor is already linked to the committee', async () => {
      const execFindOne = jest
        .fn()
        .mockResolvedValue({
          committeeId,
          name: 'Committee A',
          advisorId: advisorUserId, // already linked
        });

      mockCommitteeModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: execFindOne }),
        exec: execFindOne,
      });

      await expect(
        service.addAdvisor(
          committeeId,
          advisorUserId,
          undefined,
          coordinatorId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('throws 404 when committee does not exist', async () => {
      const execFindOne = jest.fn().mockResolvedValue(null);

      mockCommitteeModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: execFindOne }),
        exec: execFindOne,
      });

      await expect(
        service.addAdvisor(
          committeeId,
          advisorUserId,
          undefined,
          coordinatorId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws 404 when advisor user does not exist', async () => {
      const execFindOne = jest
        .fn()
        .mockResolvedValue({
          committeeId,
          name: 'Committee A',
          advisorId: null,
        });

      mockCommitteeModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: execFindOne }),
        exec: execFindOne,
      });

      mockUsersService.findByIdAndRole.mockResolvedValue(null);

      await expect(
        service.addAdvisor(
          committeeId,
          advisorUserId,
          undefined,
          coordinatorId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws 404 when user does not have advisor role', async () => {
      const execFindOne = jest
        .fn()
        .mockResolvedValue({
          committeeId,
          name: 'Committee A',
          advisorId: null,
        });

      mockCommitteeModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: execFindOne }),
        exec: execFindOne,
      });

      mockUsersService.findByIdAndRole.mockResolvedValue(null);

      await expect(
        service.addAdvisor(
          committeeId,
          advisorUserId,
          undefined,
          coordinatorId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('maps repository failure to 500', async () => {
      const execFindOne = jest
        .fn()
        .mockRejectedValue(new Error('db connection failed'));

      mockCommitteeModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: execFindOne }),
        exec: execFindOne,
      });

      await expect(
        service.addAdvisor(
          committeeId,
          advisorUserId,
          undefined,
          coordinatorId,
        ),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});