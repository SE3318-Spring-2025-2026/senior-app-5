import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../auth/enums/role.enum';
import { SchedulePhase } from './schemas/schedule.schema';
import { AdvisorsService } from './advisors.service';
import { SchedulesController } from './schedules.controller';

type SetScheduleArg = Parameters<SchedulesController['setSchedule']>[0];
type SetScheduleBody = Parameters<SchedulesController['setSchedule']>[1];
type GetActiveScheduleArg = Parameters<
  SchedulesController['getActiveSchedule']
>[0];
type GetActiveScheduleQuery = Parameters<
  SchedulesController['getActiveSchedule']
>[1];

describe('SchedulesController', () => {
  let controller: SchedulesController;

  const mockAdvisorsService = {
    setSchedule: jest.fn(),
    getActiveSchedule: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulesController],
      providers: [
        {
          provide: AdvisorsService,
          useValue: mockAdvisorsService,
        },
      ],
    }).compile();

    controller = module.get<SchedulesController>(SchedulesController);
  });

  it('should delegate set schedule to service for coordinator role', async () => {
    const expected = {
      scheduleId: 'schedule-1',
      coordinatorId: 'coordinator-1',
      phase: SchedulePhase.ADVISOR_SELECTION,
      startDatetime: new Date('2026-04-14T10:00:00.000Z').toISOString(),
      endDatetime: new Date('2026-04-14T12:00:00.000Z').toISOString(),
      createdAt: new Date('2026-04-14T09:00:00.000Z').toISOString(),
    };

    mockAdvisorsService.setSchedule.mockResolvedValue(expected);

    const request = {
      user: { role: Role.Coordinator, userId: 'coordinator-1' },
    } as SetScheduleArg;

    const body: SetScheduleBody = {
      phase: SchedulePhase.ADVISOR_SELECTION,
      startDatetime: '2026-04-14T10:00:00.000Z',
      endDatetime: '2026-04-14T12:00:00.000Z',
    };

    const result = await controller.setSchedule(request, body);

    expect(mockAdvisorsService.setSchedule).toHaveBeenCalledWith({
      phase: SchedulePhase.ADVISOR_SELECTION,
      startDatetime: '2026-04-14T10:00:00.000Z',
      endDatetime: '2026-04-14T12:00:00.000Z',
      coordinatorId: 'coordinator-1',
    });
    expect(result).toEqual(expected);
  });

  it('should delegate get active schedule to service', async () => {
    const expected = {
      scheduleId: 'schedule-1',
      coordinatorId: 'coordinator-1',
      phase: SchedulePhase.ADVISOR_SELECTION,
      startDatetime: new Date('2026-04-14T10:00:00.000Z').toISOString(),
      endDatetime: new Date('2026-04-14T12:00:00.000Z').toISOString(),
      isOpen: true,
      createdAt: new Date('2026-04-14T09:00:00.000Z').toISOString(),
    };

    mockAdvisorsService.getActiveSchedule.mockResolvedValue(expected);

    const request = {
      user: { role: Role.TeamLeader, userId: 'leader-1' },
    } as GetActiveScheduleArg;

    const query: GetActiveScheduleQuery = {
      phase: SchedulePhase.ADVISOR_SELECTION,
    };

    const result = await controller.getActiveSchedule(request, query);

    expect(mockAdvisorsService.getActiveSchedule).toHaveBeenCalledWith(
      SchedulePhase.ADVISOR_SELECTION,
    );
    expect(result).toEqual(expected);
  });

  it('should bubble not found when active schedule does not exist', async () => {
    mockAdvisorsService.getActiveSchedule.mockRejectedValue(
      new NotFoundException('No schedule found.'),
    );

    const request = {
      user: { role: Role.TeamLeader, userId: 'leader-1' },
    } as GetActiveScheduleArg;

    const query: GetActiveScheduleQuery = {
      phase: SchedulePhase.COMMITTEE_ASSIGNMENT,
    };

    await expect(
      controller.getActiveSchedule(request, query),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
