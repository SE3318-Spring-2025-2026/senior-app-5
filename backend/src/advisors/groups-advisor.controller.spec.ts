import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../auth/enums/role.enum';
import { GroupsAdvisorController } from './groups-advisor.controller';
import { AdvisorsService } from './advisors.service';
import { GroupAssignmentStatus } from '../groups/group.entity';

type GetGroupStatusReq = Parameters<
  GroupsAdvisorController['getGroupStatus']
>[0];
type TransferAdvisorReq = Parameters<
  GroupsAdvisorController['transferAdvisor']
>[0];
type TransferAdvisorBody = Parameters<
  GroupsAdvisorController['transferAdvisor']
>[2];
type DisbandGroupReq = Parameters<
  GroupsAdvisorController['disbandGroup']
>[0];

describe('GroupsAdvisorController', () => {
  let controller: GroupsAdvisorController;

  const mockAdvisorsService = {
    getGroupStatus: jest.fn(),
    transferAdvisor: jest.fn(),
    disbandGroup: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupsAdvisorController],
      providers: [
        {
          provide: AdvisorsService,
          useValue: mockAdvisorsService,
        },
      ],
    }).compile();

    controller = module.get<GroupsAdvisorController>(GroupsAdvisorController);
  });

  it('should delegate getGroupStatus to service and return result', async () => {
    const expected = {
      groupId: 'group-1',
      status: GroupAssignmentStatus.UNASSIGNED,
      advisorId: null,
      advisorName: null,
      canSubmitRequest: true,
      blockedReason: null,
      updatedAt: new Date().toISOString(),
    };

    mockAdvisorsService.getGroupStatus.mockResolvedValue(expected);

    const request = {
      user: { role: Role.TeamLeader, userId: 'leader-1' },
    } as GetGroupStatusReq;

    const result = await controller.getGroupStatus(request, 'group-1');

    expect(mockAdvisorsService.getGroupStatus).toHaveBeenCalledWith('group-1');
    expect(result).toEqual(expected);
  });

  it('should delegate transferAdvisor to service with correct input', async () => {
    const expected = {
      groupId: 'group-1',
      status: GroupAssignmentStatus.ASSIGNED,
      advisorId: 'advisor-2',
      advisorName: 'advisor2@example.com',
      canSubmitRequest: false,
      blockedReason: 'Group is already assigned to an advisor.',
      updatedAt: new Date().toISOString(),
    };

    mockAdvisorsService.transferAdvisor.mockResolvedValue(expected);

    const request = {
      user: { role: Role.Coordinator, userId: 'coordinator-1' },
    } as TransferAdvisorReq;

    const body: TransferAdvisorBody = {
      currentAdvisorId: 'advisor-1',
      newAdvisorId: 'advisor-2',
    };

    const result = await controller.transferAdvisor(request, 'group-1', body);

    expect(mockAdvisorsService.transferAdvisor).toHaveBeenCalledWith({
      groupId: 'group-1',
      currentAdvisorId: 'advisor-1',
      newAdvisorId: 'advisor-2',
    });
    expect(result).toEqual(expected);
  });

  it('should delegate disbandGroup to service and return no content', async () => {
    mockAdvisorsService.disbandGroup.mockResolvedValue(undefined);

    const request = {
      user: { role: Role.Coordinator, userId: 'coordinator-1' },
    } as DisbandGroupReq;

    const result = await controller.disbandGroup(request, 'group-1');

    expect(mockAdvisorsService.disbandGroup).toHaveBeenCalledWith('group-1');
    expect(result).toBeUndefined();
  });

  describe('RBAC Matrix Validation', () => {
    it('should allow all authenticated roles on getGroupStatus', () => {
      const roles = Reflect.getMetadata('roles', controller.getGroupStatus);
      expect(roles).toEqual([
        Role.Admin,
        Role.Coordinator,
        Role.Professor,
        Role.TeamLeader,
        Role.Student,
      ]);
    });

    it('should restrict transferAdvisor to Coordinator and Admin', () => {
      const roles = Reflect.getMetadata('roles', controller.transferAdvisor);
      expect(roles).toEqual([Role.Coordinator, Role.Admin]);
    });

    it('should restrict disbandGroup to Coordinator and Admin', () => {
      const roles = Reflect.getMetadata('roles', controller.disbandGroup);
      expect(roles).toEqual([Role.Coordinator, Role.Admin]);
    });
  });
});
