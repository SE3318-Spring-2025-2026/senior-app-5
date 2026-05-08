import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { App } from 'supertest/types';
import { AdvisorRequestsController } from '../src/advisors/advisor-requests.controller';
import { GroupsAdvisorController } from '../src/advisors/groups-advisor.controller';
import { AdvisorsService } from '../src/advisors/advisors.service';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { Role } from '../src/auth/enums/role.enum';
import { UsersService } from '../src/users/users.service';

/**
 * Process 4 gap tests — endpoints not covered by the existing e2e suite:
 *   GET  /requests              (4.2 list requests)
 *   GET  /groups/:id/status     (4.6 group assignment status)
 *   PATCH /groups/:id/advisor   (4.5 transfer advisor)
 *   DELETE /groups/:id          (4.6 disband group)
 */
describe('Process 4 gaps (e2e)', () => {
  let app: INestApplication<App>;
  const secret = 'process4-gaps-test-secret';

  const advisorId = '507f191e810c19729de860ea';
  const newAdvisorId = '507f191e810c19729de860eb';
  const groupId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  const mockListResult = {
    data: [
      {
        requestId: 'req-1',
        groupId: 'group-1',
        submittedBy: 'team-leader-id',
        requestedAdvisorId: advisorId,
        status: 'PENDING',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
  };

  const mockGroupStatus = {
    groupId,
    status: 'UNASSIGNED',
    advisorId: null,
    advisorName: null,
    canSubmitRequest: true,
    blockedReason: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockTransferResult = {
    groupId,
    status: 'ASSIGNED',
    advisorId: newAdvisorId,
    advisorName: 'New Advisor',
    canSubmitRequest: false,
    blockedReason: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockAdvisorsService = {
    listRequests: jest.fn().mockResolvedValue(mockListResult),
    getGroupStatus: jest.fn().mockResolvedValue(mockGroupStatus),
    transferAdvisor: jest.fn().mockResolvedValue(mockTransferResult),
    disbandGroup: jest.fn().mockResolvedValue(undefined),
  };

  const usersById = new Map<string, { role: string }>([
    ['coordinator-id', { role: Role.Coordinator }],
    ['team-leader-id', { role: Role.TeamLeader }],
    [advisorId, { role: Role.Professor }],
    ['student-id', { role: Role.Student }],
  ]);

  const mockUsersService = {
    findById: jest.fn((id: string) => Promise.resolve(usersById.get(id))),
  };

  function token(sub: string) {
    return jwt.sign({ sub, email: `${sub}@test.com` }, secret, {
      expiresIn: '15m',
    });
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [AdvisorRequestsController, GroupsAdvisorController],
      providers: [
        { provide: AdvisorsService, useValue: mockAdvisorsService },
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue(secret) },
        },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // ─── GET /requests ───────────────────────────────────────────────────────────

  describe('GET /requests', () => {
    it('401 when no JWT', () => {
      return request(app.getHttpServer()).get('/requests').expect(401);
    });

    it('403 for STUDENT role', () => {
      return request(app.getHttpServer())
        .get('/requests')
        .set('Authorization', `Bearer ${token('student-id')}`)
        .expect(403);
    });

    it('200 with paginated list for COORDINATOR', async () => {
      const res = await request(app.getHttpServer())
        .get('/requests')
        .set('Authorization', `Bearer ${token('coordinator-id')}`)
        .expect(200);

      expect(res.body).toEqual(mockListResult);
      expect(mockAdvisorsService.listRequests).toHaveBeenCalledWith(
        expect.objectContaining({ callerId: 'coordinator-id', callerRole: Role.Coordinator }),
      );
    });

    it('200 with paginated list for ADVISOR (Professor role)', async () => {
      const res = await request(app.getHttpServer())
        .get('/requests')
        .set('Authorization', `Bearer ${token(advisorId)}`)
        .expect(200);

      expect(res.body).toEqual(mockListResult);
    });

    it('200 with paginated list for TEAM_LEADER', async () => {
      const res = await request(app.getHttpServer())
        .get('/requests')
        .set('Authorization', `Bearer ${token('team-leader-id')}`)
        .expect(200);

      expect(res.body).toEqual(mockListResult);
    });

    it('200 passes status filter to service', async () => {
      await request(app.getHttpServer())
        .get('/requests?status=PENDING')
        .set('Authorization', `Bearer ${token('coordinator-id')}`)
        .expect(200);

      expect(mockAdvisorsService.listRequests).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PENDING' }),
      );
    });

    it('400 for invalid status enum value', () => {
      return request(app.getHttpServer())
        .get('/requests?status=INVALID_STATUS')
        .set('Authorization', `Bearer ${token('coordinator-id')}`)
        .expect(400);
    });

    it('400 for invalid page (0)', () => {
      return request(app.getHttpServer())
        .get('/requests?page=0')
        .set('Authorization', `Bearer ${token('coordinator-id')}`)
        .expect(400);
    });

    it('400 for limit over max (101)', () => {
      return request(app.getHttpServer())
        .get('/requests?limit=101')
        .set('Authorization', `Bearer ${token('coordinator-id')}`)
        .expect(400);
    });
  });

  // ─── GET /groups/:groupId/status ─────────────────────────────────────────────

  describe('GET /groups/:groupId/status', () => {
    it('401 when no JWT', () => {
      return request(app.getHttpServer())
        .get(`/groups/${groupId}/status`)
        .expect(401);
    });

    it('200 for TEAM_LEADER — any authenticated role can check status', async () => {
      const res = await request(app.getHttpServer())
        .get(`/groups/${groupId}/status`)
        .set('Authorization', `Bearer ${token('team-leader-id')}`)
        .expect(200);

      expect(res.body).toMatchObject({ groupId, status: 'UNASSIGNED' });
      expect(mockAdvisorsService.getGroupStatus).toHaveBeenCalledWith(groupId);
    });

    it('200 for COORDINATOR', async () => {
      await request(app.getHttpServer())
        .get(`/groups/${groupId}/status`)
        .set('Authorization', `Bearer ${token('coordinator-id')}`)
        .expect(200);
    });

    it('400 for non-UUID groupId', () => {
      return request(app.getHttpServer())
        .get('/groups/not-a-uuid/status')
        .set('Authorization', `Bearer ${token('coordinator-id')}`)
        .expect(400);
    });

    it('404 when group does not exist', () => {
      mockAdvisorsService.getGroupStatus.mockRejectedValueOnce(
        new NotFoundException('Group not found.'),
      );

      return request(app.getHttpServer())
        .get(`/groups/${groupId}/status`)
        .set('Authorization', `Bearer ${token('coordinator-id')}`)
        .expect(404);
    });
  });

  // ─── PATCH /groups/:groupId/advisor ──────────────────────────────────────────

  describe('PATCH /groups/:groupId/advisor', () => {
    const validBody = {
      currentAdvisorId: advisorId,
      newAdvisorId,
    };

    it('401 when no JWT', () => {
      return request(app.getHttpServer())
        .patch(`/groups/${groupId}/advisor`)
        .send(validBody)
        .expect(401);
    });

    it('403 for TEAM_LEADER role', () => {
      return request(app.getHttpServer())
        .patch(`/groups/${groupId}/advisor`)
        .set('Authorization', `Bearer ${token('team-leader-id')}`)
        .send(validBody)
        .expect(403);
    });

    it('400 for non-UUID groupId', () => {
      return request(app.getHttpServer())
        .patch('/groups/not-a-uuid/advisor')
        .set('Authorization', `Bearer ${token('coordinator-id')}`)
        .send(validBody)
        .expect(400);
    });

    it('200 for COORDINATOR with valid body', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/groups/${groupId}/advisor`)
        .set('Authorization', `Bearer ${token('coordinator-id')}`)
        .send(validBody)
        .expect(200);

      expect(res.body).toMatchObject({ groupId, status: 'ASSIGNED' });
      expect(mockAdvisorsService.transferAdvisor).toHaveBeenCalledWith({
        groupId,
        currentAdvisorId: advisorId,
        newAdvisorId,
      });
    });

    it('404 when group or advisor not found', () => {
      mockAdvisorsService.transferAdvisor.mockRejectedValueOnce(
        new NotFoundException('Group or advisor not found.'),
      );

      return request(app.getHttpServer())
        .patch(`/groups/${groupId}/advisor`)
        .set('Authorization', `Bearer ${token('coordinator-id')}`)
        .send(validBody)
        .expect(404);
    });
  });

  // ─── DELETE /groups/:groupId ──────────────────────────────────────────────────

  describe('DELETE /groups/:groupId', () => {
    it('401 when no JWT', () => {
      return request(app.getHttpServer())
        .delete(`/groups/${groupId}`)
        .expect(401);
    });

    it('403 for TEAM_LEADER role', () => {
      return request(app.getHttpServer())
        .delete(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${token('team-leader-id')}`)
        .expect(403);
    });

    it('400 for non-UUID groupId', () => {
      return request(app.getHttpServer())
        .delete('/groups/not-a-uuid')
        .set('Authorization', `Bearer ${token('coordinator-id')}`)
        .expect(400);
    });

    it('204 for COORDINATOR on valid group', async () => {
      await request(app.getHttpServer())
        .delete(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${token('coordinator-id')}`)
        .expect(204);

      expect(mockAdvisorsService.disbandGroup).toHaveBeenCalledWith(groupId);
    });

    it('404 when group does not exist', () => {
      mockAdvisorsService.disbandGroup.mockRejectedValueOnce(
        new NotFoundException('Group not found.'),
      );

      return request(app.getHttpServer())
        .delete(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${token('coordinator-id')}`)
        .expect(404);
    });
  });
});
