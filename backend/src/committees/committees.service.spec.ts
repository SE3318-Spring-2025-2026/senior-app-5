import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommitteesService } from './committees.service';
import { Committee } from './schemas/committee.schema';
import { Group } from '../groups/group.entity';
import { ListCommitteeGroupsQueryDto } from './dto/list-committee-groups-query.dto';
import { ListCommitteeAdvisorsQueryDto } from './dto/list-committee-advisors-query.dto';
import { ListCommitteesQueryDto } from './dto/list-committees-query.dto';
import { Schedule } from '../advisors/schemas/schedule.schema';

describe('CommitteesService', () => {
  let service: CommitteesService;

  const now = new Date('2025-06-01T10:00:00.000Z');

  const mockCommittee = {
    id: 'test-uuid',
    name: 'Test Committee',
    jury: [],
    advisors: [],
    groups: [],
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: null,
  };

  const mockCommitteeModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockGroupModel = {
    findOne: jest.fn(),
  };

  const mockScheduleModel = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommitteesService,
        {
          provide: getModelToken(Committee.name),
          useValue: mockCommitteeModel,
        },
        {
          provide: getModelToken(Group.name),
          useValue: mockGroupModel,
        },
        {
          provide: getModelToken(Schedule.name),
          useValue: mockScheduleModel,
        },
      ],
    }).compile();

    service = module.get<CommitteesService>(CommitteesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── createCommittee ──────────────────────────────────────────────────────

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

  // ─── listCommitteeGroups ──────────────────────────────────────────────────

  describe('listCommitteeGroups', () => {
    const committeeId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    const makeGroups = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        groupId: `group-${i + 1}`,
        assignedAt: new Date(now.getTime() + i * 1000),
        assignedByUserId: `coordinator-${i + 1}`,
      }));

    const defaultQuery = (): ListCommitteeGroupsQueryDto => {
      const q = new ListCommitteeGroupsQueryDto();
      q.page = 1;
      q.limit = 20;
      return q;
    };

    it('happy path: committee with assigned groups → paginated CommitteeGroupPage', async () => {
      const groups = makeGroups(3);
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockCommittee, id: committeeId, groups }),
      });

      const result = await service.listCommitteeGroups(
        committeeId,
        defaultQuery(),
      );

      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toMatchObject({
        groupId: 'group-1',
        assignedByUserId: 'coordinator-1',
      });
      expect(result.data[0].assignedAt).toBeInstanceOf(Date);
    });

    it('empty: committee exists but no groups assigned → data: [], total: 0', async () => {
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockCommittee, id: committeeId, groups: [] }),
      });

      const result = await service.listCommitteeGroups(
        committeeId,
        defaultQuery(),
      );

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('pagination: page 2 with limit 2 returns correct slice', async () => {
      const groups = makeGroups(5);
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockCommittee, id: committeeId, groups }),
      });

      const query = new ListCommitteeGroupsQueryDto();
      query.page = 2;
      query.limit = 2;

      const result = await service.listCommitteeGroups(committeeId, query);

      expect(result.total).toBe(5);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].groupId).toBe('group-3');
      expect(result.data[1].groupId).toBe('group-4');
    });

    it('pagination: last page returns remaining items', async () => {
      const groups = makeGroups(5);
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockCommittee, id: committeeId, groups }),
      });

      const query = new ListCommitteeGroupsQueryDto();
      query.page = 3;
      query.limit = 2;

      const result = await service.listCommitteeGroups(committeeId, query);

      expect(result.total).toBe(5);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].groupId).toBe('group-5');
    });

    it('failure: committee not found → throws NotFoundException (404)', async () => {
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.listCommitteeGroups(committeeId, defaultQuery()),
      ).rejects.toThrow(NotFoundException);
    });

    it('failure: committee not found → error message includes committeeId', async () => {
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.listCommitteeGroups(committeeId, defaultQuery()),
      ).rejects.toThrow(`Committee with ID '${committeeId}' not found.`);
    });

    it('failure: repository throws → throws InternalServerErrorException (500)', async () => {
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB timeout')),
      });

      await expect(
        service.listCommitteeGroups(committeeId, defaultQuery()),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('failure: repository throws → error message is generic to caller', async () => {
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB timeout')),
      });

      await expect(
        service.listCommitteeGroups(committeeId, defaultQuery()),
      ).rejects.toThrow(
        'Failed to retrieve committee groups due to an unexpected error.',
      );
    });

    it('each item does not include committeeId', async () => {
      const groups = makeGroups(1);
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockCommittee, id: committeeId, groups }),
      });

      const result = await service.listCommitteeGroups(
        committeeId,
        defaultQuery(),
      );

      expect(result.data[0]).not.toHaveProperty('committeeId');
    });
  });

  // ─── listCommitteeAdvisors ────────────────────────────────────────────────

  describe('listCommitteeAdvisors', () => {
    const committeeId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    const makeAdvisors = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        advisorId: `advisor-${i + 1}`,
        assignedAt: new Date(now.getTime() + i * 1000),
        assignmentSource: 'PRIMARY_ADVISOR',
      }));

    const defaultQuery = (): ListCommitteeAdvisorsQueryDto => {
      const q = new ListCommitteeAdvisorsQueryDto();
      q.page = 1;
      q.limit = 20;
      return q;
    };

    it('happy path: committee with linked advisors → paginated CommitteeAdvisorPage', async () => {
      const advisors = makeAdvisors(3);
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockCommittee, id: committeeId, advisors }),
      });

      const result = await service.listCommitteeAdvisors(
        committeeId,
        defaultQuery(),
      );

      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toMatchObject({
        advisorUserId: 'advisor-1',
      });
      expect(result.data[0].assignedAt).toBeInstanceOf(Date);
    });

    it('empty: committee exists but no advisors linked → data: [], total: 0', async () => {
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockCommittee,
          id: committeeId,
          advisors: [],
        }),
      });

      const result = await service.listCommitteeAdvisors(
        committeeId,
        defaultQuery(),
      );

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('pagination: page 2 with limit 2 returns correct slice', async () => {
      const advisors = makeAdvisors(5);
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockCommittee, id: committeeId, advisors }),
      });

      const query = new ListCommitteeAdvisorsQueryDto();
      query.page = 2;
      query.limit = 2;

      const result = await service.listCommitteeAdvisors(committeeId, query);

      expect(result.total).toBe(5);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].advisorUserId).toBe('advisor-3');
      expect(result.data[1].advisorUserId).toBe('advisor-4');
    });

    it('pagination: last page returns remaining items', async () => {
      const advisors = makeAdvisors(5);
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockCommittee, id: committeeId, advisors }),
      });

      const query = new ListCommitteeAdvisorsQueryDto();
      query.page = 3;
      query.limit = 2;

      const result = await service.listCommitteeAdvisors(committeeId, query);

      expect(result.total).toBe(5);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].advisorUserId).toBe('advisor-5');
    });

    it('failure: committee not found → throws NotFoundException (404)', async () => {
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.listCommitteeAdvisors(committeeId, defaultQuery()),
      ).rejects.toThrow(NotFoundException);
    });

    it('failure: committee not found → error message includes committeeId', async () => {
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.listCommitteeAdvisors(committeeId, defaultQuery()),
      ).rejects.toThrow(`Committee with ID '${committeeId}' not found.`);
    });

    it('failure: repository throws → throws InternalServerErrorException (500)', async () => {
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB timeout')),
      });

      await expect(
        service.listCommitteeAdvisors(committeeId, defaultQuery()),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('failure: repository throws → error message is generic to caller', async () => {
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB timeout')),
      });

      await expect(
        service.listCommitteeAdvisors(committeeId, defaultQuery()),
      ).rejects.toThrow(
        'Failed to retrieve committee advisors due to an unexpected error.',
      );
    });

    it('each item does not include committeeId', async () => {
      const advisors = makeAdvisors(1);
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockCommittee, id: committeeId, advisors }),
      });

      const result = await service.listCommitteeAdvisors(
        committeeId,
        defaultQuery(),
      );

      expect(result.data[0]).not.toHaveProperty('committeeId');
    });

    it('no assignment source field returned — excluded by design', async () => {
      const advisors = makeAdvisors(1);
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockCommittee, id: committeeId, advisors }),
      });

      const result = await service.listCommitteeAdvisors(
        committeeId,
        defaultQuery(),
      );

      expect(result.data[0]).not.toHaveProperty('assignmentSource');
    });

    it('results scoped to given committeeId only', async () => {
      const advisors = makeAdvisors(2);
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockCommittee, id: committeeId, advisors }),
      });

      const result = await service.listCommitteeAdvisors(
        committeeId,
        defaultQuery(),
      );

      expect(mockCommitteeModel.findOne).toHaveBeenCalledWith({
        id: committeeId,
      });
      expect(result.total).toBe(2);
    });
  });

  // ─── listCommittees ─────────────────────────────────────────────────────

  describe('listCommittees', () => {
    const makeCommittees = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        id: `uuid-${i + 1}`,
        name: `Committee ${i + 1}`,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        updatedAt: null,
      }));

    const defaultQuery = (): ListCommitteesQueryDto => {
      const q = new ListCommitteesQueryDto();
      q.page = 1;
      q.limit = 20;
      return q;
    };

    const setupMock = (committees: any[], total: number) => {
      mockCommitteeModel.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(committees),
          }),
        }),
      });
      mockCommitteeModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(total),
      });
    };

    it('happy path: COORDINATOR, no filters → paginated list of committees', async () => {
      const committees = makeCommittees(3);
      setupMock(committees, 3);

      const result = await service.listCommittees(defaultQuery(), 'COORDINATOR');

      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toMatchObject({ id: 'uuid-1', name: 'Committee 1' });
    });

    it('filter: name=partial → only matching committees returned', async () => {
      const committees = makeCommittees(1);
      setupMock(committees, 1);

      const query = defaultQuery();
      query.name = 'Comm';
      const result = await service.listCommittees(query, 'COORDINATOR');

      expect(mockCommitteeModel.find).toHaveBeenCalledWith(
        { name: { $regex: 'Comm', $options: 'i' } },
        { jury: 0, advisors: 0, groups: 0 },
      );
      expect(result.total).toBe(1);
    });

    it('pagination: page=2 → correct offset slice', async () => {
      const committees = makeCommittees(2);
      setupMock(committees, 5);

      const query = new ListCommitteesQueryDto();
      query.page = 2;
      query.limit = 2;

      const result = await service.listCommittees(query, 'COORDINATOR');

      expect(result.total).toBe(5);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(2);
      expect(result.data).toHaveLength(2);
    });

    it('empty result: no matching committees → data: [], total: 0', async () => {
      setupMock([], 0);

      const result = await service.listCommittees(defaultQuery(), 'COORDINATOR');

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('failure: repository throws → 500', async () => {
      mockCommitteeModel.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockRejectedValue(new Error('DB timeout')),
          }),
        }),
      });
      mockCommitteeModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB timeout')),
      });

      await expect(
        service.listCommittees(defaultQuery(), 'COORDINATOR'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('failure: error message is generic to caller', async () => {
      mockCommitteeModel.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockRejectedValue(new Error('DB timeout')),
          }),
        }),
      });
      mockCommitteeModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB timeout')),
      });

      await expect(
        service.listCommittees(defaultQuery(), 'COORDINATOR'),
      ).rejects.toThrow(
        'Failed to retrieve committees due to an unexpected error.',
      );
    });

    it('embedded arrays (jury, advisors, groups) are excluded via projection', async () => {
      setupMock([], 0);

      await service.listCommittees(defaultQuery(), 'COORDINATOR');

      expect(mockCommitteeModel.find).toHaveBeenCalledWith(
        {},
        { jury: 0, advisors: 0, groups: 0 },
      );
    });

    it('no name filter → empty filter object passed to DB', async () => {
      setupMock([], 0);

      await service.listCommittees(defaultQuery(), 'COORDINATOR');

      expect(mockCommitteeModel.find).toHaveBeenCalledWith(
        {},
        expect.any(Object),
      );
      expect(mockCommitteeModel.countDocuments).toHaveBeenCalledWith({});
    });
  });
  // ─── removeJuryMember ─────────────────────────────────────────────────────

  describe('removeJuryMember', () => {
    const committeeId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const userId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const coordinatorId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

    it('happy path: jury member exists → member removed, returns void', async () => {
      const committeeWithMember = {
        ...mockCommittee,
        id: committeeId,
        jury: [{ userId, name: 'Jury User' }],
      };
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(committeeWithMember),
      });
      mockCommitteeModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(committeeWithMember),
      });

      const result = await service.removeJuryMember(
        committeeId,
        userId,
        coordinatorId,
        'corr-xyz',
      );

      expect(result).toBeUndefined();
      expect(mockCommitteeModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: committeeId },
        { $pull: { jury: { userId } } },
      );
    });

    it('failure: committee not found → throws NotFoundException (404)', async () => {
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.removeJuryMember(committeeId, userId, coordinatorId),
      ).rejects.toThrow(NotFoundException);
    });

    it('failure: committee not found → error message includes committeeId', async () => {
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.removeJuryMember(committeeId, userId, coordinatorId),
      ).rejects.toThrow(`Committee with ID '${committeeId}' not found.`);
    });

    it('failure: jury member not in committee → throws NotFoundException (404)', async () => {
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockCommittee, id: committeeId, jury: [] }),
      });

      await expect(
        service.removeJuryMember(committeeId, userId, coordinatorId),
      ).rejects.toThrow(NotFoundException);
    });

    it('failure: jury member not in committee → error message includes userId', async () => {
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockCommittee, id: committeeId, jury: [] }),
      });

      await expect(
        service.removeJuryMember(committeeId, userId, coordinatorId),
      ).rejects.toThrow(
        `Jury member with user ID '${userId}' not found in committee '${committeeId}'.`,
      );
    });

    it('failure: repository throws on findOne → throws InternalServerErrorException (500)', async () => {
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB timeout')),
      });

      await expect(
        service.removeJuryMember(committeeId, userId, coordinatorId),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('failure: repository throws → error message is generic to caller', async () => {
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB timeout')),
      });

      await expect(
        service.removeJuryMember(committeeId, userId, coordinatorId),
      ).rejects.toThrow(
        'Failed to remove jury member due to an unexpected error.',
      );
    });
  });

  describe('assignGroupToCommittee', () => {
    const committeeId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const groupId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const advisorId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

    function mockOpenSchedule() {
      const start = new Date(Date.now() - 10 * 60 * 1000);
      const end = new Date(Date.now() + 10 * 60 * 1000);
      mockScheduleModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest
              .fn()
              .mockResolvedValue({ startDatetime: start, endDatetime: end }),
          }),
        }),
      });
    }

    it('happy path: advisor auto-linked when missing', async () => {
      mockOpenSchedule();
      mockCommitteeModel.findOne
        .mockReturnValueOnce({
          exec: jest
            .fn()
            .mockResolvedValue({ ...mockCommittee, id: committeeId, advisors: [], groups: [] }),
        })
        .mockReturnValueOnce({
          lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
        });
      mockGroupModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ groupId, assignedAdvisorId: advisorId }),
        }),
      });
      mockCommitteeModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      const result = await service.assignGroupToCommittee(
        committeeId,
        { groupId },
        'coord-1',
      );

      expect(result.groupId).toBe(groupId);
      expect(result.assignedByUserId).toBe('coord-1');
      expect(result.assignedAt).toBeInstanceOf(Date);
      expect(mockCommitteeModel.updateOne).toHaveBeenCalled();
    });

    it('happy path: advisor already linked -> no duplicate advisor link', async () => {
      mockOpenSchedule();
      mockCommitteeModel.findOne
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue({
            ...mockCommittee,
            id: committeeId,
            advisors: [{ advisorId, assignedAt: now, assignedByUserId: 'coord-0' }],
            groups: [],
          }),
        })
        .mockReturnValueOnce({
          lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
        });
      mockGroupModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ groupId, assignedAdvisorId: advisorId }),
        }),
      });
      mockCommitteeModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      await service.assignGroupToCommittee(committeeId, { groupId }, 'coord-1');

      const updatePayload = mockCommitteeModel.updateOne.mock.calls[0][1].$set;
      expect(updatePayload.advisors).toHaveLength(1);
      expect(updatePayload.advisors[0].advisorId).toBe(advisorId);
    });

    it('failure: group already assigned -> 409', async () => {
      mockOpenSchedule();
      mockCommitteeModel.findOne
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue({ ...mockCommittee, id: committeeId }),
        })
        .mockReturnValueOnce({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({ id: 'existing-committee' }),
          }),
        });
      mockGroupModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ groupId, assignedAdvisorId: advisorId }),
        }),
      });

      await expect(
        service.assignGroupToCommittee(committeeId, { groupId }, 'coord-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('failure: group has no advisor -> 422', async () => {
      mockOpenSchedule();
      mockCommitteeModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ ...mockCommittee, id: committeeId }),
      });
      mockGroupModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ groupId, assignedAdvisorId: null }),
        }),
      });

      await expect(
        service.assignGroupToCommittee(committeeId, { groupId }, 'coord-1'),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('failure: schedule window closed -> 423', async () => {
      mockScheduleModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest
              .fn()
              .mockResolvedValue({
                startDatetime: new Date(Date.now() - 20 * 60 * 1000),
                endDatetime: new Date(Date.now() - 10 * 60 * 1000),
              }),
          }),
        }),
      });

      await expect(
        service.assignGroupToCommittee(committeeId, { groupId }, 'coord-1'),
      ).rejects.toMatchObject({ status: 423 });
    });

    it('failure: committee not found -> 404', async () => {
      mockOpenSchedule();
      mockCommitteeModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.assignGroupToCommittee(committeeId, { groupId }, 'coord-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('failure: group not found -> 404', async () => {
      mockOpenSchedule();
      mockCommitteeModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ ...mockCommittee, id: committeeId }),
      });
      mockGroupModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      });

      await expect(
        service.assignGroupToCommittee(committeeId, { groupId }, 'coord-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('failure: repository throws -> 500', async () => {
      mockScheduleModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockRejectedValue(new Error('db error')),
          }),
        }),
      });

      await expect(
        service.assignGroupToCommittee(committeeId, { groupId }, 'coord-1'),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  // ─── removeCommitteeAdvisor ───────────────────────────────────────────────

  describe('removeCommitteeAdvisor', () => {
    const committeeId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const advisorUserId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const coordinatorId = 'coord-123';

    it('happy path: existing advisor link → resolves void and calls updateOne', async () => {
      const committeeWithAdvisor = {
        ...mockCommittee,
        advisors: [{ advisorId: advisorUserId, assignedAt: new Date() }],
      };

      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(committeeWithAdvisor),
      });
      mockCommitteeModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      await expect(
        service.removeCommitteeAdvisor(committeeId, advisorUserId, coordinatorId),
      ).resolves.toBeUndefined();

      expect(mockCommitteeModel.updateOne).toHaveBeenCalledWith(
        { id: committeeId },
        { $set: { advisors: [] } },
      );
    });

    it('happy path: advisor stored as advisorUserId field → still found and removed', async () => {
      const committeeWithAdvisor = {
        ...mockCommittee,
        advisors: [{ advisorUserId, assignedAt: new Date() }],
      };

      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(committeeWithAdvisor),
      });
      mockCommitteeModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      await expect(
        service.removeCommitteeAdvisor(committeeId, advisorUserId, coordinatorId),
      ).resolves.toBeUndefined();

      expect(mockCommitteeModel.updateOne).toHaveBeenCalled();
    });

    it('failure: committee not found → NotFoundException', async () => {
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.removeCommitteeAdvisor(committeeId, advisorUserId, coordinatorId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('failure: advisor link not found → NotFoundException', async () => {
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockCommittee,
          advisors: [{ advisorId: 'different-id', assignedAt: new Date() }],
        }),
      });

      await expect(
        service.removeCommitteeAdvisor(committeeId, advisorUserId, coordinatorId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('failure: repository throws → InternalServerErrorException', async () => {
      mockCommitteeModel.findOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('db error')),
      });

      await expect(
        service.removeCommitteeAdvisor(committeeId, advisorUserId, coordinatorId),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });
});
