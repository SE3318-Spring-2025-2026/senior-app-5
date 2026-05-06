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
import {
  Group,
  GroupAssignmentStatus,
  GroupStatus,
} from '../groups/group.entity';
import {
  AdvisorRequest,
  AdvisorRequestStatus,
} from './schemas/advisor-request.schema';
import { Schedule, SchedulePhase } from './schemas/schedule.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { AdvisorDecision } from './dto/decision-request.dto';
import { Role } from '../auth/enums/role.enum';

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

  const mockGroupFindOneAndUpdateQuery = {
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  const mockGroupUpdateOneQuery = {
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

  const mockAdvisorRequestFindOneQuery = {
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  const mockAdvisorRequestFindOneAndUpdateQuery = {
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  const mockAdvisorRequestUpdateManyQuery = {
    exec: jest.fn(),
  };

  const mockAdvisorRequestFindQuery = {
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  const mockAdvisorRequestDeleteManyQuery = {
    exec: jest.fn(),
  };

  const mockUserUpdateManyQuery = {
    exec: jest.fn(),
  };

  const mockUserModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
  };

  const mockGroupModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
  };

  const mockAdvisorRequestModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    countDocuments: jest.fn(),
    deleteMany: jest.fn(),
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
    notifyAdvisorRequestApproved: jest.fn(),
    notifyAdvisorRequestRejected: jest.fn(),
    notifyAdvisorRequestWithdrawn: jest.fn(),
    notifyAdvisorReleased: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockQuery.exec.mockReset();
    mockUserFindOneQuery.exec.mockReset();
    mockGroupFindOneQuery.exec.mockReset();
    mockGroupFindOneAndUpdateQuery.exec.mockReset();
    mockGroupUpdateOneQuery.exec.mockReset();
    mockScheduleFindOneQuery.exec.mockReset();
    mockExistsQuery.exec.mockReset();
    mockAdvisorRequestFindOneQuery.exec.mockReset();
    mockAdvisorRequestFindOneAndUpdateQuery.exec.mockReset();
    mockAdvisorRequestUpdateManyQuery.exec.mockReset();

    mockUserModel.find.mockReset();
    mockUserModel.findOne.mockReset();
    mockUserModel.countDocuments.mockReset();
    mockUserModel.updateMany.mockReset();
    mockGroupModel.findOne.mockReset();
    mockGroupModel.findOneAndUpdate.mockReset();
    mockGroupModel.updateOne.mockReset();
    mockGroupModel.updateMany.mockReset();
    mockAdvisorRequestModel.findOne.mockReset();
    mockAdvisorRequestModel.find.mockReset();
    mockAdvisorRequestModel.findOneAndUpdate.mockReset();
    mockAdvisorRequestModel.updateMany.mockReset();
    mockAdvisorRequestModel.countDocuments.mockReset();
    mockAdvisorRequestModel.deleteMany.mockReset();
    mockAdvisorRequestModel.exists.mockReset();
    mockAdvisorRequestModel.create.mockReset();
    mockScheduleModel.findOne.mockReset();
    mockScheduleModel.create.mockReset();

    mockAdvisorRequestFindQuery.exec.mockReset();
    mockAdvisorRequestDeleteManyQuery.exec.mockReset();
    mockUserUpdateManyQuery.exec.mockReset();

    mockScheduleModel.updateMany.mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue({ acknowledged: true }),
    }));

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
        role: Role.Professor,
      },
    ]);

    const query: ListAdvisorsQueryDto = {
      page: 2,
      limit: 10,
    };

    const result = await service.listAdvisors(query);

    expect(mockUserModel.countDocuments).toHaveBeenCalledWith({
      role: { $in: [Role.Professor] },
    });
    expect(mockUserModel.find).toHaveBeenCalledWith({
      role: { $in: [Role.Professor] },
    });
    expect(mockQuery.skip).toHaveBeenCalledWith(10);
    expect(mockQuery.limit).toHaveBeenCalledWith(10);
    expect(result).toEqual({
      data: [
        {
          advisorId: 'advisor-1',
          name: 'advisor@example.com',
          email: 'advisor@example.com',
          role: Role.Professor,
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
        role: Role.Professor,
      },
    ]);

    const result = await service.listAdvisors({} as ListAdvisorsQueryDto);

    expect(mockUserModel.find).toHaveBeenCalledWith({
      role: { $in: [Role.Professor] },
    });
    expect(mockQuery.skip).toHaveBeenCalledWith(0);
    expect(mockQuery.limit).toHaveBeenCalledWith(20);
    expect(result).toEqual({
      data: [
        {
          advisorId: 'advisor-1',
          name: 'advisor@example.com',
          email: 'advisor@example.com',
          role: Role.Professor,
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
      role: Role.Professor,
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
      role: Role.Professor,
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
      role: Role.Professor,
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
      assignmentStatus: GroupAssignmentStatus.ASSIGNED,
      assignedAdvisorId: 'advisor-1',
    });

    mockUserModel.findOne.mockReturnValue(mockUserFindOneQuery);
    mockUserFindOneQuery.exec.mockResolvedValue({
      _id: 'advisor-1',
      role: Role.Professor,
    });

    mockScheduleModel.findOne.mockReturnValue(mockScheduleFindOneQuery);
    mockScheduleFindOneQuery.exec.mockResolvedValue({
      phase: SchedulePhase.ADVISOR_SELECTION,
      startDatetime: new Date(Date.now() - 1000 * 60),
      endDatetime: new Date(Date.now() + 1000 * 60),
    });

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
      role: Role.Professor,
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

  it('should approve pending request, reject competing requests, and notify submitter', async () => {
    mockAdvisorRequestModel.findOne.mockReturnValue(
      mockAdvisorRequestFindOneQuery,
    );
    mockAdvisorRequestFindOneQuery.exec
      .mockResolvedValueOnce({
        requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        groupId: 'group-1',
        submittedBy: 'leader-1',
        requestedAdvisorId: 'advisor-1',
        status: AdvisorRequestStatus.PENDING,
      })
      .mockResolvedValueOnce({
        requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        groupId: 'group-1',
        submittedBy: 'leader-1',
        requestedAdvisorId: 'advisor-1',
        status: AdvisorRequestStatus.APPROVED,
      });

    mockAdvisorRequestModel.findOneAndUpdate.mockReturnValue(
      mockAdvisorRequestFindOneAndUpdateQuery,
    );
    mockAdvisorRequestFindOneAndUpdateQuery.exec.mockResolvedValue({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      groupId: 'group-1',
      submittedBy: 'leader-1',
      requestedAdvisorId: 'advisor-1',
      status: AdvisorRequestStatus.APPROVED,
    });

    mockAdvisorRequestModel.updateMany.mockReturnValue(
      mockAdvisorRequestUpdateManyQuery,
    );
    mockAdvisorRequestUpdateManyQuery.exec.mockResolvedValue({
      acknowledged: true,
      modifiedCount: 2,
    });

    mockGroupModel.updateOne.mockReturnValue(mockGroupUpdateOneQuery);
    mockGroupUpdateOneQuery.exec.mockResolvedValue({
      acknowledged: true,
      modifiedCount: 1,
    });

    const result = await service.decideRequest({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      advisorId: 'advisor-1',
      decision: AdvisorDecision.APPROVE,
    });

    expect(result.status).toBe(AdvisorRequestStatus.APPROVED);
    expect(mockAdvisorRequestModel.updateMany).toHaveBeenNthCalledWith(
      1,
      {
        groupId: 'group-1',
        requestId: { $ne: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
        status: AdvisorRequestStatus.APPROVED,
      },
      { $set: { status: AdvisorRequestStatus.REJECTED } },
    );
    expect(mockAdvisorRequestModel.updateMany).toHaveBeenNthCalledWith(
      2,
      {
        groupId: 'group-1',
        requestId: { $ne: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
        status: AdvisorRequestStatus.PENDING,
      },
      { $set: { status: AdvisorRequestStatus.REJECTED } },
    );
    expect(
      mockNotificationsService.notifyAdvisorRequestApproved,
    ).toHaveBeenCalledWith({
      recipientUserId: 'leader-1',
      groupId: 'group-1',
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    });
  });

  it('should reject pending request and notify submitter', async () => {
    mockAdvisorRequestModel.findOne.mockReturnValue(
      mockAdvisorRequestFindOneQuery,
    );
    mockAdvisorRequestFindOneQuery.exec
      .mockResolvedValueOnce({
        requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        groupId: 'group-1',
        submittedBy: 'leader-1',
        requestedAdvisorId: 'advisor-1',
        status: AdvisorRequestStatus.PENDING,
      })
      .mockResolvedValueOnce({
        requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        groupId: 'group-1',
        submittedBy: 'leader-1',
        requestedAdvisorId: 'advisor-1',
        status: AdvisorRequestStatus.REJECTED,
      });

    mockAdvisorRequestModel.findOneAndUpdate.mockReturnValue(
      mockAdvisorRequestFindOneAndUpdateQuery,
    );
    mockAdvisorRequestFindOneAndUpdateQuery.exec.mockResolvedValue({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      groupId: 'group-1',
      submittedBy: 'leader-1',
      requestedAdvisorId: 'advisor-1',
      status: AdvisorRequestStatus.REJECTED,
    });

    const result = await service.decideRequest({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      advisorId: 'advisor-1',
      decision: AdvisorDecision.REJECT,
    });

    expect(result.status).toBe(AdvisorRequestStatus.REJECTED);
    expect(mockAdvisorRequestModel.updateMany).not.toHaveBeenCalled();
    expect(
      mockNotificationsService.notifyAdvisorRequestRejected,
    ).toHaveBeenCalledWith({
      recipientUserId: 'leader-1',
      groupId: 'group-1',
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    });
  });

  it('should return 404 when deciding a non-existent request', async () => {
    mockAdvisorRequestModel.findOne.mockReturnValue(
      mockAdvisorRequestFindOneQuery,
    );
    mockAdvisorRequestFindOneQuery.exec.mockResolvedValue(null);

    await expect(
      service.decideRequest({
        requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        advisorId: 'advisor-1',
        decision: AdvisorDecision.APPROVE,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should return 403 for advisor ownership mismatch', async () => {
    mockAdvisorRequestModel.findOne.mockReturnValue(
      mockAdvisorRequestFindOneQuery,
    );
    mockAdvisorRequestFindOneQuery.exec.mockResolvedValue({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      groupId: 'group-1',
      submittedBy: 'leader-1',
      requestedAdvisorId: 'advisor-2',
      status: AdvisorRequestStatus.PENDING,
    });

    await expect(
      service.decideRequest({
        requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        advisorId: 'advisor-1',
        decision: AdvisorDecision.APPROVE,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should return 409 when request is not pending', async () => {
    mockAdvisorRequestModel.findOne.mockReturnValue(
      mockAdvisorRequestFindOneQuery,
    );
    mockAdvisorRequestFindOneQuery.exec.mockResolvedValue({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      groupId: 'group-1',
      submittedBy: 'leader-1',
      requestedAdvisorId: 'advisor-1',
      status: AdvisorRequestStatus.APPROVED,
    });

    await expect(
      service.decideRequest({
        requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        advisorId: 'advisor-1',
        decision: AdvisorDecision.APPROVE,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should map update failures in decide request to internal server error', async () => {
    mockAdvisorRequestModel.findOne.mockReturnValue(
      mockAdvisorRequestFindOneQuery,
    );
    mockAdvisorRequestFindOneQuery.exec.mockResolvedValue({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      groupId: 'group-1',
      submittedBy: 'leader-1',
      requestedAdvisorId: 'advisor-1',
      status: AdvisorRequestStatus.PENDING,
    });

    mockAdvisorRequestModel.findOneAndUpdate.mockReturnValue(
      mockAdvisorRequestFindOneAndUpdateQuery,
    );
    mockAdvisorRequestFindOneAndUpdateQuery.exec.mockResolvedValue({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      groupId: 'group-1',
      submittedBy: 'leader-1',
      requestedAdvisorId: 'advisor-1',
      status: AdvisorRequestStatus.APPROVED,
    });

    mockAdvisorRequestModel.updateMany.mockReturnValue(
      mockAdvisorRequestUpdateManyQuery,
    );
    mockAdvisorRequestUpdateManyQuery.exec.mockRejectedValue(
      new Error('db down'),
    );

    await expect(
      service.decideRequest({
        requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        advisorId: 'advisor-1',
        decision: AdvisorDecision.APPROVE,
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(
      mockNotificationsService.notifyAdvisorRequestApproved,
    ).not.toHaveBeenCalled();
  });

  it('should withdraw pending request and notify requested advisor', async () => {
    mockAdvisorRequestModel.findOne.mockReturnValue(
      mockAdvisorRequestFindOneQuery,
    );
    mockAdvisorRequestFindOneQuery.exec
      .mockResolvedValueOnce({
        requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        groupId: 'group-1',
        submittedBy: 'team-leader-1',
        requestedAdvisorId: 'advisor-1',
        status: AdvisorRequestStatus.PENDING,
      })
      .mockResolvedValueOnce({
        requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        groupId: 'group-1',
        submittedBy: 'team-leader-1',
        requestedAdvisorId: 'advisor-1',
        status: AdvisorRequestStatus.WITHDRAWN,
      });

    mockAdvisorRequestModel.findOneAndUpdate.mockReturnValue(
      mockAdvisorRequestFindOneAndUpdateQuery,
    );
    mockAdvisorRequestFindOneAndUpdateQuery.exec.mockResolvedValue({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      groupId: 'group-1',
      submittedBy: 'team-leader-1',
      requestedAdvisorId: 'advisor-1',
      status: AdvisorRequestStatus.WITHDRAWN,
    });

    const result = await service.withdrawRequest({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      teamLeaderId: 'team-leader-1',
    });

    expect(result.status).toBe(AdvisorRequestStatus.WITHDRAWN);
    expect(mockAdvisorRequestModel.findOneAndUpdate).toHaveBeenCalledWith(
      {
        requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        submittedBy: 'team-leader-1',
        status: AdvisorRequestStatus.PENDING,
      },
      { $set: { status: AdvisorRequestStatus.WITHDRAWN } },
      { returnDocument: 'after' },
    );
    expect(
      mockNotificationsService.notifyAdvisorRequestWithdrawn,
    ).toHaveBeenCalledWith({
      recipientUserId: 'advisor-1',
      groupId: 'group-1',
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    });
  });

  it('should return 404 when withdrawing a non-existent request', async () => {
    mockAdvisorRequestModel.findOne.mockReturnValue(
      mockAdvisorRequestFindOneQuery,
    );
    mockAdvisorRequestFindOneQuery.exec.mockResolvedValue(null);

    await expect(
      service.withdrawRequest({
        requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        teamLeaderId: 'team-leader-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should return 403 when team leader does not own request', async () => {
    mockAdvisorRequestModel.findOne.mockReturnValue(
      mockAdvisorRequestFindOneQuery,
    );
    mockAdvisorRequestFindOneQuery.exec.mockResolvedValue({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      groupId: 'group-1',
      submittedBy: 'team-leader-2',
      requestedAdvisorId: 'advisor-1',
      status: AdvisorRequestStatus.PENDING,
    });

    await expect(
      service.withdrawRequest({
        requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        teamLeaderId: 'team-leader-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should return 409 when withdrawing a non-pending request', async () => {
    mockAdvisorRequestModel.findOne.mockReturnValue(
      mockAdvisorRequestFindOneQuery,
    );
    mockAdvisorRequestFindOneQuery.exec.mockResolvedValue({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      groupId: 'group-1',
      submittedBy: 'team-leader-1',
      requestedAdvisorId: 'advisor-1',
      status: AdvisorRequestStatus.APPROVED,
    });

    await expect(
      service.withdrawRequest({
        requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        teamLeaderId: 'team-leader-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should return 409 when request is concurrently transitioned before withdrawal', async () => {
    mockAdvisorRequestModel.findOne.mockReturnValue(
      mockAdvisorRequestFindOneQuery,
    );
    mockAdvisorRequestFindOneQuery.exec.mockResolvedValue({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      groupId: 'group-1',
      submittedBy: 'team-leader-1',
      requestedAdvisorId: 'advisor-1',
      status: AdvisorRequestStatus.PENDING,
    });

    mockAdvisorRequestModel.findOneAndUpdate.mockReturnValue(
      mockAdvisorRequestFindOneAndUpdateQuery,
    );
    mockAdvisorRequestFindOneAndUpdateQuery.exec.mockResolvedValue(null);

    await expect(
      service.withdrawRequest({
        requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        teamLeaderId: 'team-leader-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should map unknown failures in withdraw request to internal server error', async () => {
    mockAdvisorRequestModel.findOne.mockReturnValue(
      mockAdvisorRequestFindOneQuery,
    );
    mockAdvisorRequestFindOneQuery.exec.mockResolvedValue({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      groupId: 'group-1',
      submittedBy: 'team-leader-1',
      requestedAdvisorId: 'advisor-1',
      status: AdvisorRequestStatus.PENDING,
    });

    mockAdvisorRequestModel.findOneAndUpdate.mockReturnValue(
      mockAdvisorRequestFindOneAndUpdateQuery,
    );
    mockAdvisorRequestFindOneAndUpdateQuery.exec.mockResolvedValue({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      groupId: 'group-1',
      submittedBy: 'team-leader-1',
      requestedAdvisorId: 'advisor-1',
      status: AdvisorRequestStatus.WITHDRAWN,
    });

    mockAdvisorRequestFindOneQuery.exec.mockResolvedValueOnce({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      groupId: 'group-1',
      submittedBy: 'team-leader-1',
      requestedAdvisorId: 'advisor-1',
      status: AdvisorRequestStatus.PENDING,
    });
    mockAdvisorRequestFindOneQuery.exec.mockRejectedValueOnce(
      new Error('db down'),
    );

    await expect(
      service.withdrawRequest({
        requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        teamLeaderId: 'team-leader-1',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('should release assigned group for coordinator and return UNASSIGNED status', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      status: GroupStatus.ACTIVE,
      assignmentStatus: GroupAssignmentStatus.ASSIGNED,
      assignedAdvisorId: 'advisor-1',
    });

    mockUserModel.findOne.mockReturnValue(mockUserFindOneQuery);
    mockUserFindOneQuery.exec.mockResolvedValue({
      _id: 'advisor-1',
      name: 'Advisor One',
      email: 'advisor1@example.com',
      role: Role.Professor,
    });

    mockGroupModel.findOneAndUpdate.mockReturnValue(
      mockGroupFindOneAndUpdateQuery,
    );
    mockGroupFindOneAndUpdateQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      status: GroupStatus.ACTIVE,
      assignmentStatus: GroupAssignmentStatus.UNASSIGNED,
      assignedAdvisorId: null,
    });

    const result = await service.releaseTeam({
      advisorId: 'advisor-1',
      groupId: 'group-1',
      callerId: 'coordinator-1',
      callerRole: Role.Coordinator,
    });

    expect(mockGroupModel.findOneAndUpdate).toHaveBeenCalledWith(
      {
        groupId: 'group-1',
        assignmentStatus: GroupAssignmentStatus.ASSIGNED,
        assignedAdvisorId: 'advisor-1',
      },
      {
        $set: {
          assignmentStatus: GroupAssignmentStatus.UNASSIGNED,
          assignedAdvisorId: null,
        },
      },
      { returnDocument: 'after' },
    );
    expect(result.status).toBe(GroupAssignmentStatus.UNASSIGNED);
    expect(result.canSubmitRequest).toBe(true);
    expect(mockNotificationsService.notifyAdvisorReleased).toHaveBeenCalledWith(
      {
        recipientUserId: 'advisor-1',
        groupId: 'group-1',
      },
    );
  });

  it('should release assigned group for advisor releasing own assignment', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      status: GroupStatus.ACTIVE,
      assignmentStatus: GroupAssignmentStatus.ASSIGNED,
      assignedAdvisorId: 'advisor-1',
    });

    mockUserModel.findOne.mockReturnValue(mockUserFindOneQuery);
    mockUserFindOneQuery.exec.mockResolvedValue({
      _id: 'advisor-1',
      email: 'advisor1@example.com',
      role: Role.Professor,
    });

    mockGroupModel.findOneAndUpdate.mockReturnValue(
      mockGroupFindOneAndUpdateQuery,
    );
    mockGroupFindOneAndUpdateQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      status: GroupStatus.ACTIVE,
      assignmentStatus: GroupAssignmentStatus.UNASSIGNED,
      assignedAdvisorId: null,
    });

    const result = await service.releaseTeam({
      advisorId: 'advisor-1',
      groupId: 'group-1',
      callerId: 'advisor-1',
      callerRole: Role.Professor,
    });

    expect(result.status).toBe(GroupAssignmentStatus.UNASSIGNED);
    expect(result.canSubmitRequest).toBe(true);
  });

  it('should return 403 when advisor tries to release another advisor assignment', async () => {
    await expect(
      service.releaseTeam({
        advisorId: 'advisor-1',
        groupId: 'group-1',
        callerId: 'advisor-2',
        callerRole: Role.Professor,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should return 404 when group is not found for release', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue(null);

    await expect(
      service.releaseTeam({
        advisorId: 'advisor-1',
        groupId: 'group-1',
        callerId: 'coordinator-1',
        callerRole: Role.Coordinator,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should return idempotent success when group is already unassigned', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      status: GroupStatus.ACTIVE,
      assignmentStatus: GroupAssignmentStatus.UNASSIGNED,
      assignedAdvisorId: null,
    });

    const result = await service.releaseTeam({
      advisorId: 'advisor-1',
      groupId: 'group-1',
      callerId: 'coordinator-1',
      callerRole: Role.Coordinator,
    });

    expect(result.status).toBe(GroupAssignmentStatus.UNASSIGNED);
    expect(result.canSubmitRequest).toBe(true);
    expect(mockGroupModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('should map repository failure in release to internal server error', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      status: GroupStatus.ACTIVE,
      assignmentStatus: GroupAssignmentStatus.ASSIGNED,
      assignedAdvisorId: 'advisor-1',
    });

    mockUserModel.findOne.mockReturnValue(mockUserFindOneQuery);
    mockUserFindOneQuery.exec.mockRejectedValue(new Error('db down'));

    await expect(
      service.releaseTeam({
        advisorId: 'advisor-1',
        groupId: 'group-1',
        callerId: 'coordinator-1',
        callerRole: Role.Coordinator,
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  // ── listRequests ────────────────────────────────────────────────────────────

  it('should scope list requests to own group for TEAM_LEADER', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      leaderUserId: 'leader-1',
      status: GroupStatus.ACTIVE,
    });

    mockAdvisorRequestModel.find.mockReturnValue(mockAdvisorRequestFindQuery);
    mockAdvisorRequestFindQuery.exec.mockResolvedValue([
      { requestId: 'req-1', groupId: 'group-1', status: 'PENDING' },
    ]);
    mockAdvisorRequestModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });

    const result = await service.listRequests({
      callerId: 'leader-1',
      callerRole: Role.TeamLeader,
      page: 1,
      limit: 20,
    });

    expect(mockGroupModel.findOne).toHaveBeenCalledWith({
      leaderUserId: 'leader-1',
      status: GroupStatus.ACTIVE,
    });
    expect(mockAdvisorRequestModel.find).toHaveBeenCalledWith({
      groupId: 'group-1',
    });
    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
  });

  it('should scope list requests to own advisorId for PROFESSOR', async () => {
    mockAdvisorRequestModel.find.mockReturnValue(mockAdvisorRequestFindQuery);
    mockAdvisorRequestFindQuery.exec.mockResolvedValue([
      { requestId: 'req-2', requestedAdvisorId: 'advisor-1', status: 'PENDING' },
    ]);
    mockAdvisorRequestModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });

    const result = await service.listRequests({
      callerId: 'advisor-1',
      callerRole: Role.Professor,
      page: 1,
      limit: 20,
    });

    expect(mockAdvisorRequestModel.find).toHaveBeenCalledWith({
      requestedAdvisorId: 'advisor-1',
    });
    expect(result.total).toBe(1);
  });

  it('should allow coordinator to filter by requestedAdvisorId', async () => {
    mockAdvisorRequestModel.find.mockReturnValue(mockAdvisorRequestFindQuery);
    mockAdvisorRequestFindQuery.exec.mockResolvedValue([]);
    mockAdvisorRequestModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });

    await service.listRequests({
      callerId: 'coordinator-1',
      callerRole: Role.Coordinator,
      requestedAdvisorId: 'advisor-2',
      page: 1,
      limit: 20,
    });

    expect(mockAdvisorRequestModel.find).toHaveBeenCalledWith({
      requestedAdvisorId: 'advisor-2',
    });
  });

  it('should allow coordinator to filter by status', async () => {
    mockAdvisorRequestModel.find.mockReturnValue(mockAdvisorRequestFindQuery);
    mockAdvisorRequestFindQuery.exec.mockResolvedValue([]);
    mockAdvisorRequestModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });

    await service.listRequests({
      callerId: 'coordinator-1',
      callerRole: Role.Coordinator,
      status: AdvisorRequestStatus.APPROVED,
      page: 1,
      limit: 20,
    });

    expect(mockAdvisorRequestModel.find).toHaveBeenCalledWith({
      status: AdvisorRequestStatus.APPROVED,
    });
  });

  it('should return 404 when team leader has no active group', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue(null);

    await expect(
      service.listRequests({
        callerId: 'leader-1',
        callerRole: Role.TeamLeader,
        page: 1,
        limit: 20,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should map db failure in listRequests to internal server error', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      leaderUserId: 'leader-1',
      status: GroupStatus.ACTIVE,
    });

    mockAdvisorRequestModel.find.mockReturnValue(mockAdvisorRequestFindQuery);
    mockAdvisorRequestFindQuery.exec.mockRejectedValue(new Error('db down'));
    mockAdvisorRequestModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });

    await expect(
      service.listRequests({
        callerId: 'leader-1',
        callerRole: Role.TeamLeader,
        page: 1,
        limit: 20,
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  // ── getGroupStatus ───────────────────────────────────────────────────────────

  it('should return UNASSIGNED status for group with no advisor', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      status: GroupStatus.ACTIVE,
      assignmentStatus: GroupAssignmentStatus.UNASSIGNED,
      assignedAdvisorId: null,
    });

    const result = await service.getGroupStatus('group-1');

    expect(result.groupId).toBe('group-1');
    expect(result.status).toBe(GroupAssignmentStatus.UNASSIGNED);
    expect(result.canSubmitRequest).toBe(true);
    expect(result.advisorId).toBeNull();
  });

  it('should return ASSIGNED status with advisor email when group has advisor', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      status: GroupStatus.ACTIVE,
      assignmentStatus: GroupAssignmentStatus.ASSIGNED,
      assignedAdvisorId: 'advisor-1',
    });

    mockUserModel.findOne.mockReturnValue(mockUserFindOneQuery);
    mockUserFindOneQuery.exec.mockResolvedValue({
      _id: 'advisor-1',
      email: 'advisor@example.com',
      role: Role.Professor,
    });

    const result = await service.getGroupStatus('group-1');

    expect(result.status).toBe(GroupAssignmentStatus.ASSIGNED);
    expect(result.advisorId).toBe('advisor-1');
    expect(result.advisorName).toBe('advisor@example.com');
    expect(result.canSubmitRequest).toBe(false);
  });

  it('should return DISBANDED status for disbanded group', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      status: GroupStatus.DISBANDED,
      assignmentStatus: GroupAssignmentStatus.UNASSIGNED,
      assignedAdvisorId: null,
    });

    const result = await service.getGroupStatus('group-1');

    expect(result.status).toBe('DISBANDED');
    expect(result.canSubmitRequest).toBe(false);
  });

  it('should return 404 when group is not found in getGroupStatus', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue(null);

    await expect(service.getGroupStatus('group-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  // ── transferAdvisor ──────────────────────────────────────────────────────────

  it('should transfer advisor and notify old advisor', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      status: GroupStatus.ACTIVE,
      assignmentStatus: GroupAssignmentStatus.ASSIGNED,
      assignedAdvisorId: 'advisor-1',
    });

    mockUserModel.findOne.mockReturnValue(mockUserFindOneQuery);
    mockUserFindOneQuery.exec.mockResolvedValue({
      _id: 'advisor-2',
      email: 'advisor2@example.com',
      role: Role.Professor,
    });

    mockGroupModel.findOneAndUpdate.mockReturnValue(
      mockGroupFindOneAndUpdateQuery,
    );
    mockGroupFindOneAndUpdateQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      status: GroupStatus.ACTIVE,
      assignmentStatus: GroupAssignmentStatus.ASSIGNED,
      assignedAdvisorId: 'advisor-2',
    });

    const result = await service.transferAdvisor({
      groupId: 'group-1',
      currentAdvisorId: 'advisor-1',
      newAdvisorId: 'advisor-2',
    });

    expect(mockGroupModel.findOneAndUpdate).toHaveBeenCalledWith(
      { groupId: 'group-1', assignedAdvisorId: 'advisor-1' },
      { $set: { assignedAdvisorId: 'advisor-2' } },
      { returnDocument: 'after' },
    );
    expect(result.advisorId).toBe('advisor-2');
    expect(mockNotificationsService.notifyAdvisorReleased).toHaveBeenCalledWith({
      recipientUserId: 'advisor-1',
      groupId: 'group-1',
    });
  });

  it('should return 400 when transferring to the same advisor', async () => {
    await expect(
      service.transferAdvisor({
        groupId: 'group-1',
        currentAdvisorId: 'advisor-1',
        newAdvisorId: 'advisor-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should return 404 when group is not found in transferAdvisor', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue(null);

    await expect(
      service.transferAdvisor({
        groupId: 'group-x',
        currentAdvisorId: 'advisor-1',
        newAdvisorId: 'advisor-2',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should return 409 when group is disbanded in transferAdvisor', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      status: GroupStatus.DISBANDED,
      assignedAdvisorId: 'advisor-1',
    });

    await expect(
      service.transferAdvisor({
        groupId: 'group-1',
        currentAdvisorId: 'advisor-1',
        newAdvisorId: 'advisor-2',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should return 400 when currentAdvisorId does not match the group advisor', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      status: GroupStatus.ACTIVE,
      assignmentStatus: GroupAssignmentStatus.ASSIGNED,
      assignedAdvisorId: 'advisor-99',
    });

    await expect(
      service.transferAdvisor({
        groupId: 'group-1',
        currentAdvisorId: 'advisor-1',
        newAdvisorId: 'advisor-2',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should return 404 when new advisor does not exist', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      status: GroupStatus.ACTIVE,
      assignmentStatus: GroupAssignmentStatus.ASSIGNED,
      assignedAdvisorId: 'advisor-1',
    });

    mockUserModel.findOne.mockReturnValue(mockUserFindOneQuery);
    mockUserFindOneQuery.exec.mockResolvedValue(null);

    await expect(
      service.transferAdvisor({
        groupId: 'group-1',
        currentAdvisorId: 'advisor-1',
        newAdvisorId: 'advisor-2',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should map db failure in transferAdvisor to internal server error', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      status: GroupStatus.ACTIVE,
      assignmentStatus: GroupAssignmentStatus.ASSIGNED,
      assignedAdvisorId: 'advisor-1',
    });

    mockUserModel.findOne.mockReturnValue(mockUserFindOneQuery);
    mockUserFindOneQuery.exec.mockResolvedValue({
      _id: 'advisor-2',
      email: 'advisor2@example.com',
      role: Role.Professor,
    });

    mockGroupModel.findOneAndUpdate.mockReturnValue(
      mockGroupFindOneAndUpdateQuery,
    );
    mockGroupFindOneAndUpdateQuery.exec.mockRejectedValue(new Error('db down'));

    await expect(
      service.transferAdvisor({
        groupId: 'group-1',
        currentAdvisorId: 'advisor-1',
        newAdvisorId: 'advisor-2',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  // ── disbandGroup ─────────────────────────────────────────────────────────────

  it('should disband an unassigned group and clear all related data', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      status: GroupStatus.ACTIVE,
      assignmentStatus: GroupAssignmentStatus.UNASSIGNED,
    });

    mockGroupModel.updateOne.mockReturnValue(mockGroupUpdateOneQuery);
    mockGroupUpdateOneQuery.exec.mockResolvedValue({ acknowledged: true });

    mockAdvisorRequestModel.deleteMany.mockReturnValue(
      mockAdvisorRequestDeleteManyQuery,
    );
    mockAdvisorRequestDeleteManyQuery.exec.mockResolvedValue({
      deletedCount: 2,
    });

    mockUserModel.updateMany.mockReturnValue(mockUserUpdateManyQuery);
    mockUserUpdateManyQuery.exec.mockResolvedValue({ modifiedCount: 3 });

    await service.disbandGroup('group-1');

    expect(mockGroupModel.updateOne).toHaveBeenCalledWith(
      { groupId: 'group-1' },
      { $set: { status: GroupStatus.DISBANDED } },
    );
    expect(mockAdvisorRequestModel.deleteMany).toHaveBeenCalledWith({
      groupId: 'group-1',
    });
    expect(mockUserModel.updateMany).toHaveBeenCalledWith(
      { teamId: 'group-1' },
      { $set: { teamId: null } },
    );
  });

  it('should return without error when group is already disbanded', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      status: GroupStatus.DISBANDED,
    });

    await service.disbandGroup('group-1');

    expect(mockGroupModel.updateOne).not.toHaveBeenCalled();
    expect(mockAdvisorRequestModel.deleteMany).not.toHaveBeenCalled();
  });

  it('should return 409 when disbanding a group assigned to an advisor', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      status: GroupStatus.ACTIVE,
      assignmentStatus: GroupAssignmentStatus.ASSIGNED,
    });

    await expect(service.disbandGroup('group-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('should return 404 when group is not found in disbandGroup', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue(null);

    await expect(service.disbandGroup('group-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should map db failure in disbandGroup to internal server error', async () => {
    mockGroupModel.findOne.mockReturnValue(mockGroupFindOneQuery);
    mockGroupFindOneQuery.exec.mockResolvedValue({
      groupId: 'group-1',
      status: GroupStatus.ACTIVE,
      assignmentStatus: GroupAssignmentStatus.UNASSIGNED,
    });

    mockGroupModel.updateOne.mockReturnValue({
      exec: jest.fn().mockRejectedValue(new Error('db down')),
    });

    await expect(service.disbandGroup('group-1')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
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
        role: Role.Professor,
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
