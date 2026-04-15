import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { CommitteesController } from './committees.controller';
import { CommitteesService } from './committees.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/enums/role.enum';

describe('CommitteesController', () => {
  let controller: CommitteesController;
  let service: CommitteesService;

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
  const studentUser    = { userId: 'student-1', role: Role.Student };

  beforeEach(async () => {
    const mockService = {
      createCommittee:        jest.fn(),
      getCommitteeById:       jest.fn(),
      getCommitteeByGroupId:  jest.fn(),
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
    service    = module.get<CommitteesService>(CommitteesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── POST /committees ──────────────────────────────────────────────────────

  describe('POST /committees', () => {
    it('happy path: valid COORDINATOR + valid body → 201 with Committee shape', async () => {
      jest.spyOn(service, 'createCommittee').mockResolvedValue(mockCommittee as any);

      const req = { user: coordinatorUser, headers: {} } as any;
      const result = await controller.createCommittee({ name: 'Test Committee' }, req);

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
      jest.spyOn(service, 'createCommittee').mockResolvedValue(mockCommittee as any);

      const req = { user: coordinatorUser, headers: {} } as any;
      const result = await controller.createCommittee({ name: 'Test Committee' }, req);

      expect(Array.isArray(result.jury)).toBe(true);
      expect(Array.isArray(result.advisors)).toBe(true);
      expect(Array.isArray(result.groups)).toBe(true);
    });

    it('passes coordinatorId from JWT to service', async () => {
      jest.spyOn(service, 'createCommittee').mockResolvedValue(mockCommittee as any);

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
      jest.spyOn(service, 'createCommittee').mockRejectedValue(
        new InternalServerErrorException('Failed to create committee due to an unexpected error.'),
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
      reflector  = new Reflector();
      rolesGuard = new RolesGuard(reflector);
    });

    function makeContext(user: unknown): ExecutionContext {
      return {
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
        getHandler:   () => ({}),
        getClass:     () => ({}),
      } as unknown as ExecutionContext;
    }

    it('no required roles metadata → guard allows through', () => {
      // Reflector returns undefined (no @Roles decorator on handler)
      expect(rolesGuard.canActivate(makeContext(studentUser))).toBe(true);
    });

    it('non-COORDINATOR role with COORDINATOR requirement → throws ForbiddenException', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.Coordinator]);
      expect(() => rolesGuard.canActivate(makeContext(studentUser))).toThrow(ForbiddenException);
    });

    it('missing user with COORDINATOR requirement → throws ForbiddenException', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.Coordinator]);
      expect(() => rolesGuard.canActivate(makeContext(null))).toThrow(ForbiddenException);
    });

    it('COORDINATOR role with COORDINATOR requirement → returns true', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.Coordinator]);
      expect(rolesGuard.canActivate(makeContext(coordinatorUser))).toBe(true);
    });
  });

  // ─── GET /committees/:committeeId ─────────────────────────────────────────

  describe('GET /committees/:committeeId', () => {
    const committeeId = mockCommittee.id;

    it('happy path: existing committeeId → 200 with Committee shape', async () => {
      jest.spyOn(service, 'getCommitteeById').mockResolvedValue(mockCommittee as any);

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
      jest.spyOn(service, 'getCommitteeById').mockResolvedValue(mockCommittee as any);

      const req = { user: studentUser, headers: { 'x-correlation-id': 'corr-abc' } } as any;
      await controller.getCommitteeById(committeeId, req);

      expect(service.getCommitteeById).toHaveBeenCalledWith(committeeId, 'corr-abc');
    });

    it('committee not found → propagates NotFoundException (404)', async () => {
      jest.spyOn(service, 'getCommitteeById').mockRejectedValue(
        new NotFoundException(`Committee with ID '${committeeId}' not found.`),
      );

      const req = { user: studentUser, headers: {} } as any;
      await expect(controller.getCommitteeById(committeeId, req)).rejects.toThrow(NotFoundException);
    });

    it('unexpected repository error → propagates InternalServerErrorException (500)', async () => {
      jest.spyOn(service, 'getCommitteeById').mockRejectedValue(
        new InternalServerErrorException('Failed to retrieve committee due to an unexpected error.'),
      );

      const req = { user: studentUser, headers: {} } as any;
      await expect(controller.getCommitteeById(committeeId, req)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('embedded lists are mapped correctly when non-empty', async () => {
      const richCommittee = {
        ...mockCommittee,
        jury:     [{ userId: 'j1', name: 'Juror One' }],
        advisors: [{ userId: 'a1', name: 'Advisor One' }],
        groups:   [{ groupId: 'g1', groupName: 'Group One' }],
      };
      jest.spyOn(service, 'getCommitteeById').mockResolvedValue(richCommittee as any);

      const req = { user: studentUser, headers: {} } as any;
      const result = await controller.getCommitteeById(committeeId, req);

      expect(result.jury).toEqual([{ userId: 'j1', name: 'Juror One' }]);
      expect(result.advisors).toEqual([{ userId: 'a1', name: 'Advisor One' }]);
      expect(result.groups).toEqual([{ groupId: 'g1', groupName: 'Group One' }]);
    });
  });
});
