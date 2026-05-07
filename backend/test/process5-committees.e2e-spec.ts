import {
  ConflictException,
  INestApplication,
  NotFoundException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { CommitteesController } from '../src/committees/committees.controller';
import { CommitteesService } from '../src/committees/committees.service';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { Role } from '../src/auth/enums/role.enum';

/**
 * Process 5 gap tests — committee endpoints not covered by committee-groups.e2e-spec:
 *   GET/POST /committees                         (5.1 list, create)
 *   GET/PATCH/DELETE /committees/:id             (5.1 get, update, delete)
 *   GET/POST/DELETE /committees/:id/jury-members (5.2 jury management)
 *   GET/POST/DELETE /committees/:id/advisors     (5.3 advisor links)
 *   DELETE /committees/:id/groups/:groupId       (5.4 remove group)
 *   GET /committees/:id/advisors/:aid/groups     (5.5 advisor grading scope)
 */
describe('Process 5 – Committees (e2e)', () => {
  let app: INestApplication<App>;

  const committeeId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const advisorUserId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const juryUserId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const groupId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const now = new Date('2026-01-01T00:00:00.000Z');

  const committeePage = {
    data: [{ id: committeeId, name: 'Committee Alpha', createdAt: now.toISOString() }],
    total: 1,
    page: 1,
    limit: 20,
  };

  const juryMemberResponse = {
    userId: juryUserId,
    assignedAt: now.toISOString(),
    assignedByUserId: 'test-user',
  };

  const juryMemberPage = {
    data: [juryMemberResponse],
    total: 1,
    page: 1,
    limit: 20,
  };

  const advisorResponse = {
    committeeId,
    advisorId: advisorUserId,
    assignmentSource: 'JURY_MEMBER',
    assignedAt: now.toISOString(),
  };

  const advisorPage = {
    data: [advisorResponse],
    total: 1,
    page: 1,
    limit: 20,
  };

  const gradingScopePage = {
    data: [
      {
        groupId,
        assignedAt: now.toISOString(),
        isOwnGroup: true,
        originalAdvisorUserId: null,
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
  };

  const mockCommitteesService = {
    listCommittees: jest.fn().mockResolvedValue(committeePage),
    createCommittee: jest.fn().mockResolvedValue({
      id: committeeId,
      name: 'Committee Alpha',
      createdAt: now,
      updatedAt: null,
      jury: [],
      advisors: [],
      groups: [],
    }),
    getCommitteeById: jest.fn().mockResolvedValue({
      id: committeeId,
      name: 'Committee Alpha',
      createdAt: now,
      updatedAt: null,
      jury: [],
      advisors: [],
      groups: [],
    }),
    updateCommittee: jest.fn().mockResolvedValue({
      id: committeeId,
      name: 'Updated Name',
      createdAt: now,
      updatedAt: now,
      jury: [],
      advisors: [],
      groups: [],
    }),
    deleteCommittee: jest.fn().mockResolvedValue(undefined),
    listJuryMembers: jest.fn().mockResolvedValue(juryMemberPage),
    addJuryMember: jest.fn().mockResolvedValue(juryMemberResponse),
    removeJuryMember: jest.fn().mockResolvedValue(undefined),
    listCommitteeAdvisors: jest.fn().mockResolvedValue(advisorPage),
    addCommitteeAdvisor: jest.fn().mockResolvedValue(advisorResponse),
    removeCommitteeAdvisor: jest.fn().mockResolvedValue(undefined),
    listCommitteeGroups: jest.fn(),
    assignGroupToCommittee: jest.fn(),
    removeGroupFromCommittee: jest.fn().mockResolvedValue(undefined),
    getAdvisorGradingScope: jest.fn().mockResolvedValue(gradingScopePage),
  };

  function makeGuard(role: string) {
    return {
      canActivate: (context: any) => {
        const req = context.switchToHttp().getRequest();
        const authHeader = req.headers.authorization as string | undefined;
        if (!authHeader?.startsWith('Bearer ')) {
          throw new UnauthorizedException('Missing or invalid JWT');
        }
        const roleHeader = req.headers['x-test-role'] as string | undefined;
        req.user = { userId: 'test-user', role: roleHeader ?? role };
        return true;
      },
    };
  }

  async function buildApp(defaultRole = Role.Coordinator) {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CommitteesController],
      providers: [
        { provide: CommitteesService, useValue: mockCommitteesService },
        Reflector,
        RolesGuard,
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue(makeGuard(defaultRole))
      .compile();

    const nestApp = moduleFixture.createNestApplication();
    nestApp.setGlobalPrefix('api/v1');
    nestApp.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await nestApp.init();
    return nestApp;
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ─── GET /committees ──────────────────────────────────────────────────────────

  describe('GET /api/v1/committees', () => {
    it('401 when no JWT', async () => {
      await request(app.getHttpServer()).get('/api/v1/committees').expect(401);
    });

    it('403 for ADVISOR role', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/committees')
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Professor)
        .expect(403);
    });

    it('200 with CommitteePage for COORDINATOR', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/committees')
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .expect(200);

      expect(res.body).toMatchObject({ total: 1, page: 1, limit: 20 });
      expect(res.body.data).toHaveLength(1);
    });

    it('passes name filter to service', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/committees?name=Alpha')
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .expect(200);

      expect(mockCommitteesService.listCommittees).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Alpha' }),
        Role.Coordinator,
        undefined,
      );
    });
  });

  // ─── POST /committees ─────────────────────────────────────────────────────────

  describe('POST /api/v1/committees', () => {
    it('401 when no JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/committees')
        .send({ name: 'New Committee' })
        .expect(401);
    });

    it('403 for TEAM_LEADER role', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/committees')
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.TeamLeader)
        .send({ name: 'New Committee' })
        .expect(403);
    });

    it('400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/committees')
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .send({})
        .expect(400);
    });

    it('201 for COORDINATOR with valid name', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/committees')
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .send({ name: 'Committee Alpha' })
        .expect(201);

      expect(res.body).toMatchObject({ id: committeeId, name: 'Committee Alpha' });
      expect(mockCommitteesService.createCommittee).toHaveBeenCalledWith(
        { name: 'Committee Alpha' },
        'test-user',
        undefined,
      );
    });
  });

  // ─── GET /committees/:committeeId ─────────────────────────────────────────────

  describe('GET /api/v1/committees/:committeeId', () => {
    it('401 when no JWT', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/committees/${committeeId}`)
        .expect(401);
    });

    it('400 for non-UUID committeeId', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/committees/not-a-uuid')
        .set('Authorization', 'Bearer token')
        .expect(400);
    });

    it('200 for any authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/committees/${committeeId}`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.TeamLeader)
        .expect(200);

      expect(res.body).toMatchObject({ id: committeeId, name: 'Committee Alpha' });
    });

    it('404 when committee does not exist', async () => {
      mockCommitteesService.getCommitteeById.mockRejectedValueOnce(
        new NotFoundException('Committee not found.'),
      );

      await request(app.getHttpServer())
        .get(`/api/v1/committees/${committeeId}`)
        .set('Authorization', 'Bearer token')
        .expect(404);
    });
  });

  // ─── PATCH /committees/:committeeId ───────────────────────────────────────────

  describe('PATCH /api/v1/committees/:committeeId', () => {
    it('401 when no JWT', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/committees/${committeeId}`)
        .send({ name: 'Updated Name' })
        .expect(401);
    });

    it('403 for TEAM_LEADER role', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/committees/${committeeId}`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.TeamLeader)
        .send({ name: 'Updated Name' })
        .expect(403);
    });

    it('400 for non-UUID committeeId', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/committees/not-a-uuid')
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .send({ name: 'Updated Name' })
        .expect(400);
    });

    it('200 for COORDINATOR with valid name', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/committees/${committeeId}`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(res.body).toMatchObject({ id: committeeId, name: 'Updated Name' });
    });

    it('404 when committee does not exist', async () => {
      mockCommitteesService.updateCommittee.mockRejectedValueOnce(
        new NotFoundException('Committee not found.'),
      );

      await request(app.getHttpServer())
        .patch(`/api/v1/committees/${committeeId}`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .send({ name: 'Updated Name' })
        .expect(404);
    });
  });

  // ─── DELETE /committees/:committeeId ──────────────────────────────────────────

  describe('DELETE /api/v1/committees/:committeeId', () => {
    it('401 when no JWT', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/committees/${committeeId}`)
        .expect(401);
    });

    it('403 for ADVISOR role', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/committees/${committeeId}`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Professor)
        .expect(403);
    });

    it('400 for non-UUID committeeId', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/committees/not-a-uuid')
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .expect(400);
    });

    it('204 for COORDINATOR on valid committee', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/committees/${committeeId}`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .expect(204);

      expect(mockCommitteesService.deleteCommittee).toHaveBeenCalledWith(
        committeeId,
        'test-user',
        undefined,
      );
    });

    it('404 when committee does not exist', async () => {
      mockCommitteesService.deleteCommittee.mockRejectedValueOnce(
        new NotFoundException('Committee not found.'),
      );

      await request(app.getHttpServer())
        .delete(`/api/v1/committees/${committeeId}`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .expect(404);
    });
  });

  // ─── GET /committees/:committeeId/jury-members ────────────────────────────────

  describe('GET /api/v1/committees/:committeeId/jury-members', () => {
    it('401 when no JWT', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/committees/${committeeId}/jury-members`)
        .expect(401);
    });

    it('403 for TEAM_LEADER role', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/committees/${committeeId}/jury-members`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.TeamLeader)
        .expect(403);
    });

    it('200 with JuryMemberPage for COORDINATOR', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/committees/${committeeId}/jury-members`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .expect(200);

      expect(res.body).toMatchObject({ total: 1, page: 1 });
      expect(res.body.data[0]).toMatchObject({ userId: juryUserId });
    });

    it('404 when committee does not exist', async () => {
      mockCommitteesService.listJuryMembers.mockRejectedValueOnce(
        new NotFoundException('Committee not found.'),
      );

      await request(app.getHttpServer())
        .get(`/api/v1/committees/${committeeId}/jury-members`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .expect(404);
    });
  });

  // ─── POST /committees/:committeeId/jury-members ───────────────────────────────

  describe('POST /api/v1/committees/:committeeId/jury-members', () => {
    it('401 when no JWT', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/committees/${committeeId}/jury-members`)
        .send({ userId: juryUserId })
        .expect(401);
    });

    it('403 for ADVISOR role', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/committees/${committeeId}/jury-members`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Professor)
        .send({ userId: juryUserId })
        .expect(403);
    });

    it('400 when userId is missing', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/committees/${committeeId}/jury-members`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .send({})
        .expect(400);
    });

    it('201 for COORDINATOR with valid body', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/committees/${committeeId}/jury-members`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .send({ userId: juryUserId })
        .expect(201);

      expect(res.body).toMatchObject({ userId: juryUserId });
    });

    it('409 when user is already a jury member', async () => {
      mockCommitteesService.addJuryMember.mockRejectedValueOnce(
        new ConflictException('User is already a jury member on this committee.'),
      );

      await request(app.getHttpServer())
        .post(`/api/v1/committees/${committeeId}/jury-members`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .send({ userId: juryUserId })
        .expect(409);
    });
  });

  // ─── DELETE /committees/:committeeId/jury-members/:userId ────────────────────

  describe('DELETE /api/v1/committees/:committeeId/jury-members/:userId', () => {
    it('401 when no JWT', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/committees/${committeeId}/jury-members/${juryUserId}`)
        .expect(401);
    });

    it('403 for TEAM_LEADER role', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/committees/${committeeId}/jury-members/${juryUserId}`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.TeamLeader)
        .expect(403);
    });

    it('400 for non-UUID userId', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/committees/${committeeId}/jury-members/not-a-uuid`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .expect(400);
    });

    it('204 for COORDINATOR', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/committees/${committeeId}/jury-members/${juryUserId}`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .expect(204);

      expect(mockCommitteesService.removeJuryMember).toHaveBeenCalledWith(
        committeeId,
        juryUserId,
        'test-user',
        undefined,
      );
    });

    it('404 when jury assignment does not exist', async () => {
      mockCommitteesService.removeJuryMember.mockRejectedValueOnce(
        new NotFoundException('Jury assignment not found.'),
      );

      await request(app.getHttpServer())
        .delete(`/api/v1/committees/${committeeId}/jury-members/${juryUserId}`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .expect(404);
    });
  });

  // ─── GET /committees/:committeeId/advisors ────────────────────────────────────

  describe('GET /api/v1/committees/:committeeId/advisors', () => {
    it('401 when no JWT', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/committees/${committeeId}/advisors`)
        .expect(401);
    });

    it('403 for TEAM_LEADER role', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/committees/${committeeId}/advisors`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.TeamLeader)
        .expect(403);
    });

    it('200 with CommitteeAdvisorPage for COORDINATOR', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/committees/${committeeId}/advisors`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .expect(200);

      expect(res.body).toMatchObject({ total: 1, page: 1 });
      expect(res.body.data[0]).toMatchObject({ advisorId: advisorUserId });
    });
  });

  // ─── POST /committees/:committeeId/advisors ───────────────────────────────────

  describe('POST /api/v1/committees/:committeeId/advisors', () => {
    const validBody = {
      advisorId: advisorUserId,
      assignmentSource: 'JURY_MEMBER',
    };

    it('401 when no JWT', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/committees/${committeeId}/advisors`)
        .send(validBody)
        .expect(401);
    });

    it('403 for ADVISOR role', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/committees/${committeeId}/advisors`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Professor)
        .send(validBody)
        .expect(403);
    });

    it('400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/committees/${committeeId}/advisors`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .send({})
        .expect(400);
    });

    it('201 for COORDINATOR with valid body', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/committees/${committeeId}/advisors`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .send(validBody)
        .expect(201);

      expect(res.body).toMatchObject({ advisorId: advisorUserId });
      expect(mockCommitteesService.addCommitteeAdvisor).toHaveBeenCalledWith(
        committeeId,
        validBody,
        'test-user',
        undefined,
      );
    });

    it('409 when advisor already linked to committee', async () => {
      mockCommitteesService.addCommitteeAdvisor.mockRejectedValueOnce(
        new ConflictException('Advisor is already linked to this committee.'),
      );

      await request(app.getHttpServer())
        .post(`/api/v1/committees/${committeeId}/advisors`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .send(validBody)
        .expect(409);
    });
  });

  // ─── DELETE /committees/:committeeId/advisors/:advisorUserId ─────────────────

  describe('DELETE /api/v1/committees/:committeeId/advisors/:advisorUserId', () => {
    it('401 when no JWT', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/committees/${committeeId}/advisors/${advisorUserId}`)
        .expect(401);
    });

    it('403 for TEAM_LEADER role', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/committees/${committeeId}/advisors/${advisorUserId}`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.TeamLeader)
        .expect(403);
    });

    it('400 for non-UUID advisorUserId', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/committees/${committeeId}/advisors/not-a-uuid`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .expect(400);
    });

    it('204 for COORDINATOR', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/committees/${committeeId}/advisors/${advisorUserId}`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .expect(204);

      expect(mockCommitteesService.removeCommitteeAdvisor).toHaveBeenCalledWith(
        committeeId,
        advisorUserId,
        'test-user',
        undefined,
      );
    });

    it('404 when advisor link does not exist', async () => {
      mockCommitteesService.removeCommitteeAdvisor.mockRejectedValueOnce(
        new NotFoundException('Advisor link not found.'),
      );

      await request(app.getHttpServer())
        .delete(`/api/v1/committees/${committeeId}/advisors/${advisorUserId}`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .expect(404);
    });
  });

  // ─── DELETE /committees/:committeeId/groups/:groupId ─────────────────────────

  describe('DELETE /api/v1/committees/:committeeId/groups/:groupId', () => {
    it('401 when no JWT', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/committees/${committeeId}/groups/${groupId}`)
        .expect(401);
    });

    it('403 for ADVISOR role', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/committees/${committeeId}/groups/${groupId}`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Professor)
        .expect(403);
    });

    it('400 for non-UUID groupId', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/committees/${committeeId}/groups/not-a-uuid`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .expect(400);
    });

    it('204 for COORDINATOR', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/committees/${committeeId}/groups/${groupId}`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .expect(204);

      expect(mockCommitteesService.removeGroupFromCommittee).toHaveBeenCalledWith(
        committeeId,
        groupId,
        'test-user',
        undefined,
      );
    });

    it('404 when group assignment does not exist', async () => {
      mockCommitteesService.removeGroupFromCommittee.mockRejectedValueOnce(
        new NotFoundException('Group assignment not found.'),
      );

      await request(app.getHttpServer())
        .delete(`/api/v1/committees/${committeeId}/groups/${groupId}`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .expect(404);
    });
  });

  // ─── GET /committees/:committeeId/advisors/:advisorUserId/groups ──────────────

  describe('GET /api/v1/committees/:committeeId/advisors/:advisorUserId/groups (grading scope)', () => {
    it('401 when no JWT', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/committees/${committeeId}/advisors/${advisorUserId}/groups`)
        .expect(401);
    });

    it('403 for TEAM_LEADER role', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/committees/${committeeId}/advisors/${advisorUserId}/groups`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.TeamLeader)
        .expect(403);
    });

    it('400 for non-UUID advisorUserId', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/committees/${committeeId}/advisors/not-a-uuid/groups`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .expect(400);
    });

    it('200 with AdvisorGradingScopePage for COORDINATOR', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/committees/${committeeId}/advisors/${advisorUserId}/groups`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .expect(200);

      expect(res.body).toMatchObject({ total: 1, page: 1 });
      expect(res.body.data[0]).toMatchObject({ groupId, isOwnGroup: true });
    });

    it('200 with grading scope for ADVISOR (own scope)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/committees/${committeeId}/advisors/${advisorUserId}/groups`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Professor)
        .expect(200);

      expect(mockCommitteesService.getAdvisorGradingScope).toHaveBeenCalledWith(
        committeeId,
        advisorUserId,
        expect.objectContaining({ page: 1, limit: 20 }),
        undefined,
      );
    });

    it('isOwnGroup false for cross-grading assignment', async () => {
      mockCommitteesService.getAdvisorGradingScope.mockResolvedValueOnce({
        data: [
          {
            groupId,
            assignedAt: now.toISOString(),
            isOwnGroup: false,
            originalAdvisorUserId: 'other-advisor-id',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/committees/${committeeId}/advisors/${advisorUserId}/groups`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .expect(200);

      expect(res.body.data[0].isOwnGroup).toBe(false);
      expect(res.body.data[0].originalAdvisorUserId).toBe('other-advisor-id');
    });

    it('404 when advisor is not linked to this committee', async () => {
      mockCommitteesService.getAdvisorGradingScope.mockRejectedValueOnce(
        new NotFoundException('Advisor is not linked to this committee.'),
      );

      await request(app.getHttpServer())
        .get(`/api/v1/committees/${committeeId}/advisors/${advisorUserId}/groups`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .expect(404);
    });

    it('200 respects pagination query params', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/committees/${committeeId}/advisors/${advisorUserId}/groups?page=2&limit=5`)
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Coordinator)
        .expect(200);

      expect(mockCommitteesService.getAdvisorGradingScope).toHaveBeenCalledWith(
        committeeId,
        advisorUserId,
        expect.objectContaining({ page: 2, limit: 5 }),
        undefined,
      );
    });
  });
});
