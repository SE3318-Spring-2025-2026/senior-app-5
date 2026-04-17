import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { CommitteesController } from './committees.controller';
import { CommitteesService } from './committees.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/enums/role.enum';
import { ListCommitteeGroupsQueryDto } from './dto/list-committee-groups-query.dto';
import { ListCommitteeAdvisorsQueryDto } from './dto/list-committee-advisors-query.dto';

describe('CommitteesController', () => {
  let controller: CommitteesController;
  let service: CommitteesService;

  const now = new Date('2025-06-01T10:00:00.000Z');

  const mockCommittee = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    name: 'Test Committee',
    jury: [],
    advisors: [],
    groups: [],
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: null,
  };

  const coordinatorUser = { userId: 'coord-123', role: Role.Coordinator };
  const studentUser = { userId: 'student-1', role: Role.Student };
  const advisorUser = { userId: 'advisor-1', role: Role.Professor };
  const teamLeaderUser = { userId: 'leader-1', role: Role.TeamLeader };

  beforeEach(async () => {
    const mockService = {
      createCommittee: jest.fn(),
      getCommitteeById: jest.fn(),
      getCommitteeByGroupId: jest.fn(),
      listCommitteeGroups: jest.fn(),
      listCommitteeAdvisors: jest.fn(),
      assignGroupToCommittee: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommitteesController],
      providers: [
        { provide: CommitteesService, useValue: mockService },
        Reflector,
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CommitteesController>(CommitteesController);
    service = module.get<CommitteesService>(CommitteesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── POST /committees ──────────────────────────────────────────────────────

  describe('POST /committees', () => {
    it('happy path: valid COORDINATOR + valid body → 201 with Committee shape', async () => {
      jest
        .spyOn(service, 'createCommittee')
        .mockResolvedValue(mockCommittee as any);

      const req = { user: coordinatorUser, headers: {} } as any;
      const result = await controller.createCommittee(
        { name: 'Test Committee' },
        req,
      );

      expect(result).toMatchObject({
        id: mockCommittee.id,
        name: 'Test Committee',
        jury: [],
        advisors: [],
        groups: [],
      });
      expect(result.createdAt).toBeDefined();
    });

    it('embedded arrays are present (never null) on creation', async () => {
      jest
        .spyOn(service, 'createCommittee')
        .mockResolvedValue(mockCommittee as any);

      const req = { user: coordinatorUser, headers: {} } as any;
      const result = await controller.createCommittee(
        { name: 'Test Committee' },
        req,
      );

      expect(Array.isArray(result.jury)).toBe(true);
      expect(Array.isArray(result.advisors)).toBe(true);
      expect(Array.isArray(result.groups)).toBe(true);
    });

    it('passes coordinatorId from JWT to service', async () => {
      jest
        .spyOn(service, 'createCommittee')
        .mockResolvedValue(mockCommittee as any);

      const req = { user: coordinatorUser, headers: {} } as any;
      await controller.createCommittee({ name: 'Test Committee' }, req);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.createCommittee).toHaveBeenCalledWith(
        { name: 'Test Committee' },
        'coord-123',
        undefined,
      );
    });

    it('failure: service throws InternalServerErrorException → propagates 500', async () => {
      jest
        .spyOn(service, 'createCommittee')
        .mockRejectedValue(
          new InternalServerErrorException(
            'Failed to create committee due to an unexpected error.',
          ),
        );

      const req = { user: coordinatorUser, headers: {} } as any;
      await expect(
        controller.createCommittee({ name: 'Test Committee' }, req),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ─── COORDINATOR guard enforcement via RolesGuard ─────────────────────────

  describe('COORDINATOR role check via RolesGuard', () => {
    let rolesGuard: RolesGuard;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
      rolesGuard = new RolesGuard(reflector);
    });

    function makeContext(user: unknown): ExecutionContext {
      return {
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;
    }

    it('no required roles metadata → guard allows through', () => {
      expect(rolesGuard.canActivate(makeContext(studentUser))).toBe(true);
    });

    it('non-COORDINATOR role with COORDINATOR requirement → throws ForbiddenException', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Role.Coordinator]);
      expect(() => rolesGuard.canActivate(makeContext(studentUser))).toThrow(
        ForbiddenException,
      );
    });

    it('missing user with COORDINATOR requirement → throws ForbiddenException', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Role.Coordinator]);
      expect(() => rolesGuard.canActivate(makeContext(null))).toThrow(
        ForbiddenException,
      );
    });

    it('COORDINATOR role with COORDINATOR requirement → returns true', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Role.Coordinator]);
      expect(rolesGuard.canActivate(makeContext(coordinatorUser))).toBe(true);
    });

    it('ADVISOR role with COORDINATOR requirement → throws ForbiddenException', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Role.Coordinator]);
      expect(() => rolesGuard.canActivate(makeContext(advisorUser))).toThrow(
        ForbiddenException,
      );
    });

    it('TEAM_LEADER role with COORDINATOR requirement → throws ForbiddenException', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Role.Coordinator]);
      expect(() => rolesGuard.canActivate(makeContext(teamLeaderUser))).toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── GET /committees/:committeeId ─────────────────────────────────────────

  describe('GET /committees/:committeeId', () => {
    const committeeId = mockCommittee.id;

    it('happy path: existing committeeId → 200 with Committee shape', async () => {
      jest
        .spyOn(service, 'getCommitteeById')
        .mockResolvedValue(mockCommittee as any);

      const req = { user: studentUser, headers: {} } as any;
      const result = await controller.getCommitteeById(committeeId, req);

      expect(result).toMatchObject({
        id: committeeId,
        name: 'Test Committee',
        jury: [],
        advisors: [],
        groups: [],
      });
    });

    it('passes correlationId header to service', async () => {
      jest
        .spyOn(service, 'getCommitteeById')
        .mockResolvedValue(mockCommittee as any);

      const req = {
        user: studentUser,
        headers: { 'x-correlation-id': 'corr-abc' },
      } as any;
      await controller.getCommitteeById(committeeId, req);

      expect(service.getCommitteeById).toHaveBeenCalledWith(
        committeeId,
        'corr-abc',
      );
    });

    it('committee not found → propagates NotFoundException (404)', async () => {
      jest
        .spyOn(service, 'getCommitteeById')
        .mockRejectedValue(
          new NotFoundException(
            `Committee with ID '${committeeId}' not found.`,
          ),
        );

      const req = { user: studentUser, headers: {} } as any;
      await expect(
        controller.getCommitteeById(committeeId, req),
      ).rejects.toThrow(NotFoundException);
    });

    it('unexpected repository error → propagates InternalServerErrorException (500)', async () => {
      jest
        .spyOn(service, 'getCommitteeById')
        .mockRejectedValue(
          new InternalServerErrorException(
            'Failed to retrieve committee due to an unexpected error.',
          ),
        );

      const req = { user: studentUser, headers: {} } as any;
      await expect(
        controller.getCommitteeById(committeeId, req),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('embedded lists are mapped correctly when non-empty', async () => {
      const richCommittee = {
        ...mockCommittee,
        jury: [{ userId: 'j1', name: 'Juror One' }],
        advisors: [{ userId: 'a1', name: 'Advisor One' }],
        groups: [
          { groupId: 'g1', assignedAt: now, assignedByUserId: 'coord-1' },
        ],
      };
      jest
        .spyOn(service, 'getCommitteeById')
        .mockResolvedValue(richCommittee as any);

      const req = { user: studentUser, headers: {} } as any;
      const result = await controller.getCommitteeById(committeeId, req);

      expect(result.jury).toEqual([{ userId: 'j1', name: 'Juror One' }]);
      expect(result.advisors).toEqual([{ userId: 'a1', name: 'Advisor One' }]);
      expect(result.groups).toEqual([
        { groupId: 'g1', assignedAt: now, assignedByUserId: 'coord-1' },
      ]);
    });
  });

  // ─── GET /committees/:committeeId/advisors ────────────────────────────────

  describe('GET /committees/:committeeId/advisors', () => {
    const committeeId = mockCommittee.id;

    const defaultQuery = (): ListCommitteeAdvisorsQueryDto => {
      const q = new ListCommitteeAdvisorsQueryDto();
      q.page = 1;
      q.limit = 20;
      return q;
    };

    const mockPage = {
      data: [
        { advisorUserId: 'advisor-1', assignedAt: now },
        { advisorUserId: 'advisor-2', assignedAt: now },
      ],
      total: 2,
      page: 1,
      limit: 20,
    };

    it('happy path: valid COORDINATOR → 200 with CommitteeAdvisorPage shape', async () => {
      jest.spyOn(service, 'listCommitteeAdvisors').mockResolvedValue(mockPage);

      const req = { user: coordinatorUser, headers: {} } as any;
      const result = await controller.listCommitteeAdvisors(
        committeeId,
        defaultQuery(),
        req,
      );

      expect(result).toMatchObject({
        data: expect.any(Array),
        total: 2,
        page: 1,
        limit: 20,
      });
    });

    it('delegates to service with correct committeeId, query, correlationId', async () => {
      jest.spyOn(service, 'listCommitteeAdvisors').mockResolvedValue(mockPage);

      const query = defaultQuery();
      const req = {
        user: coordinatorUser,
        headers: { 'x-correlation-id': 'corr-33' },
      } as any;
      await controller.listCommitteeAdvisors(committeeId, query, req);

      expect(service.listCommitteeAdvisors).toHaveBeenCalledWith(
        committeeId,
        query,
        'corr-33',
      );
    });

    it('empty: no advisors → data: [], total: 0', async () => {
      jest.spyOn(service, 'listCommitteeAdvisors').mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      const req = { user: coordinatorUser, headers: {} } as any;
      const result = await controller.listCommitteeAdvisors(
        committeeId,
        defaultQuery(),
        req,
      );

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('items do not contain committeeId', async () => {
      jest.spyOn(service, 'listCommitteeAdvisors').mockResolvedValue(mockPage);

      const req = { user: coordinatorUser, headers: {} } as any;
      const result = await controller.listCommitteeAdvisors(
        committeeId,
        defaultQuery(),
        req,
      );

      result.data.forEach((item) => {
        expect(item).not.toHaveProperty('committeeId');
      });
    });

    it('items do not contain assignmentSource', async () => {
      jest.spyOn(service, 'listCommitteeAdvisors').mockResolvedValue(mockPage);

      const req = { user: coordinatorUser, headers: {} } as any;
      const result = await controller.listCommitteeAdvisors(
        committeeId,
        defaultQuery(),
        req,
      );

      result.data.forEach((item) => {
        expect(item).not.toHaveProperty('assignmentSource');
      });
    });

    it('committee not found → propagates NotFoundException (404)', async () => {
      jest
        .spyOn(service, 'listCommitteeAdvisors')
        .mockRejectedValue(
          new NotFoundException(
            `Committee with ID '${committeeId}' not found.`,
          ),
        );

      const req = { user: coordinatorUser, headers: {} } as any;
      await expect(
        controller.listCommitteeAdvisors(committeeId, defaultQuery(), req),
      ).rejects.toThrow(NotFoundException);
    });

    it('repository failure → propagates InternalServerErrorException (500)', async () => {
      jest
        .spyOn(service, 'listCommitteeAdvisors')
        .mockRejectedValue(
          new InternalServerErrorException(
            'Failed to retrieve committee advisors due to an unexpected error.',
          ),
        );

      const req = { user: coordinatorUser, headers: {} } as any;
      await expect(
        controller.listCommitteeAdvisors(committeeId, defaultQuery(), req),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('non-COORDINATOR role via RolesGuard → throws ForbiddenException', () => {
      const reflector = new Reflector();
      const rolesGuard = new RolesGuard(reflector);

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Role.Coordinator]);

      const ctx = {
        switchToHttp: () => ({ getRequest: () => ({ user: studentUser }) }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('ADVISOR role via RolesGuard → throws ForbiddenException (403)', () => {
      const reflector = new Reflector();
      const rolesGuard = new RolesGuard(reflector);

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Role.Coordinator]);

      const ctx = {
        switchToHttp: () => ({ getRequest: () => ({ user: advisorUser }) }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('TEAM_LEADER role via RolesGuard → throws ForbiddenException (403)', () => {
      const reflector = new Reflector();
      const rolesGuard = new RolesGuard(reflector);

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Role.Coordinator]);

      const ctx = {
        switchToHttp: () => ({ getRequest: () => ({ user: teamLeaderUser }) }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  // ─── GET /committees/:committeeId/groups ──────────────────────────────────

  describe('GET /committees/:committeeId/groups', () => {
    const committeeId = mockCommittee.id;

    const defaultQuery = (): ListCommitteeGroupsQueryDto => {
      const q = new ListCommitteeGroupsQueryDto();
      q.page = 1;
      q.limit = 20;
      return q;
    };

    const mockPage = {
      data: [
        { groupId: 'group-1', assignedAt: now, assignedByUserId: 'coord-123' },
        { groupId: 'group-2', assignedAt: now, assignedByUserId: 'coord-123' },
      ],
      total: 2,
      page: 1,
      limit: 20,
    };

    it('happy path: valid COORDINATOR → 200 with CommitteeGroupPage shape', async () => {
      jest.spyOn(service, 'listCommitteeGroups').mockResolvedValue(mockPage);

      const req = { user: coordinatorUser, headers: {} } as any;
      const result = await controller.listCommitteeGroups(
        committeeId,
        defaultQuery(),
        req,
      );

      expect(result).toMatchObject({
        data: expect.any(Array),
        total: 2,
        page: 1,
        limit: 20,
      });
    });

    it('delegates to service with correct committeeId, query, correlationId', async () => {
      jest.spyOn(service, 'listCommitteeGroups').mockResolvedValue(mockPage);

      const query = defaultQuery();
      const req = {
        user: coordinatorUser,
        headers: { 'x-correlation-id': 'corr-36' },
      } as any;
      await controller.listCommitteeGroups(committeeId, query, req);

      expect(service.listCommitteeGroups).toHaveBeenCalledWith(
        committeeId,
        query,
        'corr-36',
      );
    });

    it('empty: no groups → data: [], total: 0', async () => {
      jest.spyOn(service, 'listCommitteeGroups').mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      const req = { user: coordinatorUser, headers: {} } as any;
      const result = await controller.listCommitteeGroups(
        committeeId,
        defaultQuery(),
        req,
      );

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('items do not contain committeeId', async () => {
      jest.spyOn(service, 'listCommitteeGroups').mockResolvedValue(mockPage);

      const req = { user: coordinatorUser, headers: {} } as any;
      const result = await controller.listCommitteeGroups(
        committeeId,
        defaultQuery(),
        req,
      );

      result.data.forEach((item) => {
        expect(item).not.toHaveProperty('committeeId');
      });
    });

    it('committee not found → propagates NotFoundException (404)', async () => {
      jest
        .spyOn(service, 'listCommitteeGroups')
        .mockRejectedValue(
          new NotFoundException(
            `Committee with ID '${committeeId}' not found.`,
          ),
        );

      const req = { user: coordinatorUser, headers: {} } as any;
      await expect(
        controller.listCommitteeGroups(committeeId, defaultQuery(), req),
      ).rejects.toThrow(NotFoundException);
    });

    it('repository failure → propagates InternalServerErrorException (500)', async () => {
      jest
        .spyOn(service, 'listCommitteeGroups')
        .mockRejectedValue(
          new InternalServerErrorException(
            'Failed to retrieve committee groups due to an unexpected error.',
          ),
        );

      const req = { user: coordinatorUser, headers: {} } as any;
      await expect(
        controller.listCommitteeGroups(committeeId, defaultQuery(), req),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('non-COORDINATOR role via RolesGuard → throws ForbiddenException', () => {
      const reflector = new Reflector();
      const rolesGuard = new RolesGuard(reflector);

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Role.Coordinator]);

      const ctx = {
        switchToHttp: () => ({ getRequest: () => ({ user: studentUser }) }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  describe('POST /committees/:committeeId/groups', () => {
    const committeeId = mockCommittee.id;
    const payload = { groupId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' };

    it('valid COORDINATOR, valid body -> 201 with CommitteeGroupResponse', async () => {
      jest.spyOn(service, 'assignGroupToCommittee').mockResolvedValue({
        groupId: payload.groupId,
        assignedAt: now,
        assignedByUserId: coordinatorUser.userId,
      });

      const req = { user: coordinatorUser, headers: {} } as any;
      const result = await controller.assignGroupToCommittee(committeeId, payload, req);

      expect(result).toEqual({
        groupId: payload.groupId,
        assignedAt: now,
        assignedByUserId: coordinatorUser.userId,
      });
    });

    it('delegates to service with committeeId, body, coordinatorId, correlationId', async () => {
      jest.spyOn(service, 'assignGroupToCommittee').mockResolvedValue({
        groupId: payload.groupId,
        assignedAt: now,
        assignedByUserId: coordinatorUser.userId,
      });

      const req = {
        user: coordinatorUser,
        headers: { 'x-correlation-id': 'corr-38' },
      } as any;
      await controller.assignGroupToCommittee(committeeId, payload, req);

      expect(service.assignGroupToCommittee).toHaveBeenCalledWith(
        committeeId,
        payload,
        coordinatorUser.userId,
        'corr-38',
      );
    });

    it('group has no advisor -> propagates 422', async () => {
      jest
        .spyOn(service, 'assignGroupToCommittee')
        .mockRejectedValue(
          new UnprocessableEntityException(
            'Group does not have a confirmed advisor assignment.',
          ),
        );

      const req = { user: coordinatorUser, headers: {} } as any;
      await expect(
        controller.assignGroupToCommittee(committeeId, payload, req),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('schedule window closed -> propagates 423', async () => {
      jest
        .spyOn(service, 'assignGroupToCommittee')
        .mockRejectedValue(
          new HttpException('Committee assignment schedule window is closed.', 423),
        );

      const req = { user: coordinatorUser, headers: {} } as any;
      await expect(
        controller.assignGroupToCommittee(committeeId, payload, req),
      ).rejects.toMatchObject({ status: 423 });
    });

    it('group already assigned -> propagates 409', async () => {
      jest
        .spyOn(service, 'assignGroupToCommittee')
        .mockRejectedValue(new ConflictException('Group is already assigned to a committee.'));

      const req = { user: coordinatorUser, headers: {} } as any;
      await expect(
        controller.assignGroupToCommittee(committeeId, payload, req),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('committee not found -> propagates 404', async () => {
      jest
        .spyOn(service, 'assignGroupToCommittee')
        .mockRejectedValue(
          new NotFoundException(`Committee with ID '${committeeId}' not found.`),
        );

      const req = { user: coordinatorUser, headers: {} } as any;
      await expect(
        controller.assignGroupToCommittee(committeeId, payload, req),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('repository failure -> propagates 500', async () => {
      jest
        .spyOn(service, 'assignGroupToCommittee')
        .mockRejectedValue(
          new InternalServerErrorException(
            'Failed to assign group to committee due to an unexpected error.',
          ),
        );

      const req = { user: coordinatorUser, headers: {} } as any;
      await expect(
        controller.assignGroupToCommittee(committeeId, payload, req),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });
});
