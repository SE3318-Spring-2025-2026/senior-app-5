import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../auth/enums/role.enum';
import { AdvisorsController } from './advisors.controller';
import { AdvisorsService } from './advisors.service';

type ListAdvisorsRequestArg = Parameters<AdvisorsController['listAdvisors']>[0];
type ListAdvisorsQueryArg = Parameters<AdvisorsController['listAdvisors']>[1];
type ReleaseTeamRequestArg = Parameters<AdvisorsController['releaseTeam']>[0];

describe('AdvisorsController', () => {
  let controller: AdvisorsController;

  const mockAdvisorsService = {
    listAdvisors: jest.fn(),
    releaseTeam: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdvisorsController],
      providers: [
        {
          provide: AdvisorsService,
          useValue: mockAdvisorsService,
        },
      ],
    }).compile();

    controller = module.get<AdvisorsController>(AdvisorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  

  it('should delegate advisor listing to the service', async () => {
    const query: ListAdvisorsQueryArg = {
      page: 1,
      limit: 20,
    };
    const expected = {
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
    };

    mockAdvisorsService.listAdvisors.mockResolvedValue(expected);

    const request: ListAdvisorsRequestArg = {
      user: { role: Role.Coordinator },
    } as ListAdvisorsRequestArg;

    const result = await controller.listAdvisors(request, query);

    expect(mockAdvisorsService.listAdvisors).toHaveBeenCalledWith(query);
    expect(result).toEqual(expected);
  });

  it('should allow team leader role', async () => {
    const query: ListAdvisorsQueryArg = {
      page: 1,
      limit: 20,
    };

    const expected = {
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
    };

    mockAdvisorsService.listAdvisors.mockResolvedValue(expected);

    const request: ListAdvisorsRequestArg = {
      user: { role: Role.TeamLeader },
    } as ListAdvisorsRequestArg;

    const result = await controller.listAdvisors(request, query);

    expect(mockAdvisorsService.listAdvisors).toHaveBeenCalledWith(query);
    expect(result).toEqual(expected);
  });

  it('should delegate release team to service for coordinator role', async () => {
    const expected = {
      groupId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      status: 'UNASSIGNED',
      advisorId: null,
      advisorName: null,
      canSubmitRequest: true,
      blockedReason: null,
      updatedAt: new Date().toISOString(),
    };

    mockAdvisorsService.releaseTeam.mockResolvedValue(expected);

    const request = {
      user: {
        userId: 'coordinator-1',
        role: Role.Coordinator,
      },
    } as ReleaseTeamRequestArg;

    const result = await controller.releaseTeam(
      request,
      '507f191e810c19729de860ea',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    );

    expect(mockAdvisorsService.releaseTeam).toHaveBeenCalledWith({
      advisorId: '507f191e810c19729de860ea',
      groupId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      callerId: 'coordinator-1',
      callerRole: Role.Coordinator,
    });
    expect(result).toEqual(expected);
  });

  
  describe('RBAC Matrix Validation', () => {
    it('should restrict listAdvisors to Coordinator, TeamLeader, and Admin', () => {
      const roles = Reflect.getMetadata('roles', controller.listAdvisors);
      expect(roles).toEqual([Role.Coordinator, Role.TeamLeader, Role.Admin]);
    });

    it('should restrict releaseTeam to Coordinator, Professor, and Admin', () => {
      const roles = Reflect.getMetadata('roles', controller.releaseTeam);
      expect(roles).toEqual([Role.Coordinator, Role.Professor, Role.Admin]);
    });
  });
});