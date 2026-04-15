import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommitteesController } from './committees.controller';
import { CommitteesService } from './committees.service';
import { CoordinatorGuard } from '../auth/guards/coordinator.guard';
import { Role } from '../auth/enums/role.enum';

describe('CommitteesController', () => {
  let controller: CommitteesController;
  let service: CommitteesService;

  const mockCommittee = {
    id: 'test-uuid',
    name: 'Test Committee',
    jury: [],
    advisors: [],
    groups: [],
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: null,
  };

  const coordinatorUser = { userId: 'coord-123', role: Role.Coordinator };

  beforeEach(async () => {
    const mockService = {
      createCommittee: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommitteesController],
      providers: [
        { provide: CommitteesService, useValue: mockService },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(CoordinatorGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CommitteesController>(CommitteesController);
    service = module.get<CommitteesService>(CommitteesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /committees', () => {
    it('happy path: valid COORDINATOR + valid body → 201 with Committee shape', async () => {
      jest.spyOn(service, 'createCommittee').mockResolvedValue(mockCommittee as any);

      const req = { user: coordinatorUser, headers: {} } as any;
      const result = await controller.createCommittee({ name: 'Test Committee' }, req);

      expect(result).toMatchObject({
        id: 'test-uuid',
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

  describe('COORDINATOR guard enforcement', () => {
    it('non-COORDINATOR role → CoordinatorGuard throws ForbiddenException', () => {
      const guardInstance = new CoordinatorGuard();
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: Role.Professor } }),
        }),
      } as ExecutionContext;

      expect(() => guardInstance.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('missing user → CoordinatorGuard throws ForbiddenException', () => {
      const guardInstance = new CoordinatorGuard();
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({ user: null }),
        }),
      } as ExecutionContext;

      expect(() => guardInstance.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('COORDINATOR role → CoordinatorGuard allows access', () => {
      const guardInstance = new CoordinatorGuard();
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: Role.Coordinator } }),
        }),
      } as ExecutionContext;

      expect(guardInstance.canActivate(mockContext)).toBe(true);
    });
  });
});
