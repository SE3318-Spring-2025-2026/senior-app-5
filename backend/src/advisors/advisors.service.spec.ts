import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { AdvisorsService } from './advisors.service';
import { User } from '../users/data/user.schema';
import { ListAdvisorsQueryDto } from './dto/list-advisors-query.dto';
import { Group, GroupStatus } from '../groups/group.entity';
import {
  AdvisorRequest,
  AdvisorRequestStatus,
} from './schemas/advisor-request.schema';
import { Schedule, SchedulePhase } from './schemas/schedule.schema';
import { NotificationsService } from '../notifications/notifications.service';

describe('AdvisorsService', () => {
  let service: AdvisorsService;

  const mockQuery = {
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  const mockUserFindOneQuery = {
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  const mockGroupFindOneQuery = {
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  const mockScheduleFindOneQuery = {
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  const mockExistsQuery = {
    exec: jest.fn(),
  };

  const mockUserModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockGroupModel = {
    findOne: jest.fn(),
  };

  const mockAdvisorRequestModel = {
    exists: jest.fn(),
    create: jest.fn(),
  };

  const mockScheduleModel = {
    create: jest.fn(),
    updateMany: jest.fn(() => ({
      exec: jest.fn().mockResolvedValue({ acknowledged: true }),
    })),
    findOne: jest.fn(),
  };

  const mockNotificationsService = {
    notifyAdvisorRequestSubmitted: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvisorsService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Group.name),
          useValue: mockGroupModel,
        },
        {
          provide: getModelToken(AdvisorRequest.name),
          useValue: mockAdvisorRequestModel,
        },
        {
          provide: getModelToken(Schedule.name),
          useValue: mockScheduleModel,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<AdvisorsService>(AdvisorsService);
  });

  it('should return paginated advisors from advisor-compatible role records', async () => {
    mockUserModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });
    mockUserModel.find.mockReturnValue(mockQuery);
    mockQuery.exec.mockResolvedValue([
      {
        _id: 'advisor-1',
        email: 'advisor@example.com',
        role: 'PROFESSOR',
      },
    ]);

    const query: ListAdvisorsQueryDto = {
      page: 2,
      limit: 10,
    };

    const result = await service.listAdvisors(query);

    expect(mockUserModel.countDocuments).toHaveBeenCalledWith({
      role: { $in: ['ADVISOR', 'PROFESSOR'] },
    });
    expect(mockUserModel.find).toHaveBeenCalledWith({
      role: { $in: ['ADVISOR', 'PROFESSOR'] },
    });
    expect(mockQuery.skip).toHaveBeenCalledWith(10);
    expect(mockQuery.limit).toHaveBeenCalledWith(10);
    expect(result).toEqual({
      data: [
        {
          advisorId: 'advisor-1',
          name: 'advisor@example.com',
          email: 'advisor@example.com',
          role: 'ADVISOR',
        },
      ],
      total: 1,
      page: 2,
      limit: 10,
    });
  });

  it('should map advisor list repository failures to an internal server error', async () => {
    mockUserModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });
    mockUserModel.find.mockReturnValue(mockQuery);
    mockQuery.exec.mockRejectedValue(new Error('database failure'));

    const query: ListAdvisorsQueryDto = {
      page: 1,
      limit: 20,
    };

    await expect(service.listAdvisors(query)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('should use default role and pagination values when omitted', async () => {
    mockUserModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });
    mockUserModel.find.mockReturnValue(mockQuery);
    mockQuery.exec.mockResolvedValue([
      {
        _id: 'advisor-1',
        email: 'advisor@example.com',
        role: 'ADVISOR',
      },
    ]);

    const result = await service.listAdvisors({} as ListAdvisorsQueryDto);

    expect(mockUserModel.find).toHaveBeenCalledWith({
      role: { $in: ['ADVISOR', 'PROFESSOR'] },
    });
    expect(mockQuery.skip).toHaveBeenCalledWith(0);
    expect(mockQuery.limit).toHaveBeenCalledWith(20);
    expect(result).toEqual({
      data: [
        {
          advisorId: 'advisor-1',
          name: 'advisor@example.com',
          email: 'advisor@example.com',
          role: 'ADVISOR',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
  });

  it('should set schedule for valid coordinator and datetime range', async () => {
    mockScheduleModel.create.mockResolvedValue({
      scheduleId: 'schedule-1',
      coordinatorId: 'coordinator-1',
      phase: SchedulePhase.ADVISOR_SELECTION,
      startDatetime: new Date('2026-04-14T10:00:00.000Z'),
      endDatetime: new Date('2026-04-14T12:00:00.000Z'),
      createdAt: new Date('2026-04-14T09:00:00.000Z'),
    });

    const result = await service.setSchedule({
      coordinatorId: 'coordinator-1',
      phase: SchedulePhase.ADVISOR_SELECTION,
      startDatetime: '2026-04-14T10:00:00.000Z',
      endDatetime: '2026-04-14T12:00:00.000Z',
    });

    expect(mockScheduleModel.create).toHaveBeenCalledWith({
      coordinatorId: 'coordinator-1',
      phase: SchedulePhase.ADVISOR_SELECTION,
      startDatetime: new Date('2026-04-14T10:00:00.000Z'),
      endDatetime: new Date('2026-04-14T12:00:00.000Z'),
      isActive: true,
    });
    expect(result).toEqual({
      scheduleId: 'schedule-1',
      coordinatorId: 'coordinator-1',
      phase: SchedulePhase.ADVISOR_SELECTION,
      startDatetime: '2026-04-14T10:00:00.000Z',
      endDatetime: '2026-04-14T12:00:00.000Z',
      createdAt: '2026-04-14T09:00:00.000Z',
    });
  });

  it('should reject schedule when endDatetime is not after startDatetime', async () => {
    await expect(
      service.setSchedule({
        coordinatorId: 'coordinator-1',
        phase: SchedulePhase.ADVISOR_SELECTION,
        startDatetime: '2026-04-14T12:00:00.000Z',
        endDatetime: '2026-04-14T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should return active schedule with computed isOpen', async () => {
    mockScheduleModel.findOne.mockReturnValue(mockScheduleFindOneQuery);
    mockScheduleFindOneQuery.exec.mockResolvedValue({
      scheduleId: 'schedule-1',
      coordinatorId: 'coordinator-1',
      phase: SchedulePhase.ADVISOR_SELECTION,
      startDatetime: new Date(Date.now() - 1000 * 60),
      endDatetime: new Date(Date.now() + 1000 * 60),
      createdAt: new Date('2026-04-14T09:00:00.000Z'),
    });

    const result = await service.getActiveSchedule(
      SchedulePhase.ADVISOR_SELECTION,
    );

    expect(result.scheduleId).toBe('schedule-1');
    expect(result.phase).toBe(SchedulePhase.ADVISOR_SELECTION);
    expect(result.isOpen).toBe(true);
  });

  it('should return 404 when active schedule does not exist for phase', async () => {
    mockScheduleModel.findOne.mockReturnValue(mockScheduleFindOneQuery);
    mockScheduleFindOneQuery.exec.mockResolvedValue(null);

    await expect(
      service.getActiveSchedule(SchedulePhase.COMMITTEE_ASSIGNMENT),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should create pending advisor request and dispatch notification', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      leaderUserId: 'leader-1',
      status: GroupStatus.ACTIVE,
    });

    mockUserModel.findOne.mockReturnValue(mockUserFindOneQuery);
    mockUserFindOneQuery.exec.mockResolvedValue({
      _id: 'advisor-1',
      role: 'ADVISOR',
    });

    mockScheduleModel.findOne.mockReturnValue(mockScheduleFindOneQuery);
    mockScheduleFindOneQuery.exec.mockResolvedValue({
      phase: SchedulePhase.ADVISOR_SELECTION,
      startDatetime: new Date(Date.now() - 1000 * 60),
      endDatetime: new Date(Date.now() + 1000 * 60),
    });

    mockAdvisorRequestModel.exists.mockReturnValue(mockExistsQuery);
    mockExistsQuery.exec.mockResolvedValue(null);

    mockAdvisorRequestModel.create.mockResolvedValue({
      requestId: 'request-1',
      groupId: 'group-1',
      submittedBy: 'leader-1',
      requestedAdvisorId: 'advisor-1',
      status: AdvisorRequestStatus.PENDING,
    });

    const result = await service.submitRequest({
      submittedBy: 'leader-1',
      requestedAdvisorId: 'advisor-1',
    });

    expect(result.requestId).toBe('request-1');
    expect(mockAdvisorRequestModel.create).toHaveBeenCalledWith({
      groupId: 'group-1',
      submittedBy: 'leader-1',
      requestedAdvisorId: 'advisor-1',
      status: AdvisorRequestStatus.PENDING,
    });
    expect(
      mockNotificationsService.notifyAdvisorRequestSubmitted,
    ).toHaveBeenCalledWith({
      recipientUserId: 'advisor-1',
      groupId: 'group-1',
    });
  });

  it('should return 403 when advisor selection window is closed', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      leaderUserId: 'leader-1',
      status: GroupStatus.ACTIVE,
    });

    mockUserModel.findOne.mockReturnValue(mockUserFindOneQuery);
    mockUserFindOneQuery.exec.mockResolvedValue({
      _id: 'advisor-1',
      role: 'ADVISOR',
    });

    mockScheduleModel.findOne.mockReturnValue(mockScheduleFindOneQuery);
    mockScheduleFindOneQuery.exec.mockResolvedValue({
      phase: SchedulePhase.ADVISOR_SELECTION,
      startDatetime: new Date(Date.now() - 1000 * 120),
      endDatetime: new Date(Date.now() - 1000 * 60),
    });

    await expect(
      service.submitRequest({
        submittedBy: 'leader-1',
        requestedAdvisorId: 'advisor-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should return 409 when duplicate pending request exists', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      leaderUserId: 'leader-1',
      status: GroupStatus.ACTIVE,
    });

    mockUserModel.findOne.mockReturnValue(mockUserFindOneQuery);
    mockUserFindOneQuery.exec.mockResolvedValue({
      _id: 'advisor-1',
      role: 'ADVISOR',
    });

    mockScheduleModel.findOne.mockReturnValue(mockScheduleFindOneQuery);
    mockScheduleFindOneQuery.exec.mockResolvedValue({
      phase: SchedulePhase.ADVISOR_SELECTION,
      startDatetime: new Date(Date.now() - 1000 * 60),
      endDatetime: new Date(Date.now() + 1000 * 60),
    });

    mockAdvisorRequestModel.exists.mockReturnValue(mockExistsQuery);
    mockExistsQuery.exec.mockResolvedValue(null);

    const duplicateError = { code: 11000 };
    mockAdvisorRequestModel.create.mockRejectedValue(duplicateError);

    await expect(
      service.submitRequest({
        submittedBy: 'leader-1',
        requestedAdvisorId: 'advisor-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should return 423 when group is already assigned', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      leaderUserId: 'leader-1',
      status: GroupStatus.ACTIVE,
    });

    mockUserModel.findOne.mockReturnValue(mockUserFindOneQuery);
    mockUserFindOneQuery.exec.mockResolvedValue({
      _id: 'advisor-1',
      role: 'ADVISOR',
    });

    mockScheduleModel.findOne.mockReturnValue(mockScheduleFindOneQuery);
    mockScheduleFindOneQuery.exec.mockResolvedValue({
      phase: SchedulePhase.ADVISOR_SELECTION,
      startDatetime: new Date(Date.now() - 1000 * 60),
      endDatetime: new Date(Date.now() + 1000 * 60),
    });

    mockAdvisorRequestModel.exists.mockReturnValue(mockExistsQuery);
    mockExistsQuery.exec.mockResolvedValue(true);

    await expect(
      service.submitRequest({
        submittedBy: 'leader-1',
        requestedAdvisorId: 'advisor-1',
      }),
    ).rejects.toMatchObject({
      status: 423,
    });
  });

  it('should return 404 when requested advisor does not exist', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      leaderUserId: 'leader-1',
      status: GroupStatus.ACTIVE,
    });

    mockUserModel.findOne.mockReturnValue(mockUserFindOneQuery);
    mockUserFindOneQuery.exec.mockResolvedValue(null);

    await expect(
      service.submitRequest({
        submittedBy: 'leader-1',
        requestedAdvisorId: 'advisor-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should map unknown failures in submit request to internal server error', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      leaderUserId: 'leader-1',
      status: GroupStatus.ACTIVE,
    });

    mockUserModel.findOne.mockReturnValue(mockUserFindOneQuery);
    mockUserFindOneQuery.exec.mockResolvedValue({
      _id: 'advisor-1',
      role: 'ADVISOR',
    });

    mockScheduleModel.findOne.mockReturnValue(mockScheduleFindOneQuery);
    mockScheduleFindOneQuery.exec.mockResolvedValue({
      phase: SchedulePhase.ADVISOR_SELECTION,
      startDatetime: new Date(Date.now() - 1000 * 60),
      endDatetime: new Date(Date.now() + 1000 * 60),
    });

    mockAdvisorRequestModel.exists.mockReturnValue(mockExistsQuery);
    mockExistsQuery.exec.mockResolvedValue(null);

    mockAdvisorRequestModel.create.mockRejectedValue(new Error('db down'));

    await expect(
      service.submitRequest({
        submittedBy: 'leader-1',
        requestedAdvisorId: 'advisor-1',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('should return advisor response fields in API contract shape', async () => {
    mockUserModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });
    mockUserModel.find.mockReturnValue(mockQuery);
    mockQuery.exec.mockResolvedValue([
      {
        _id: 'advisor-1',
        email: 'advisor@example.com',
        role: 'PROFESSOR',
      },
    ]);

    const query: ListAdvisorsQueryDto = {
      page: 1,
      limit: 20,
    };

    const result = await service.listAdvisors(query);

    expect(Object.keys(result).sort()).toEqual([
      'data',
      'limit',
      'page',
      'total',
    ]);
    expect(result.data).toHaveLength(1);
    expect(Object.keys(result.data[0]).sort()).toEqual([
      'advisorId',
      'email',
      'name',
      'role',
    ]);
  });
});
