import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import request from 'supertest';
import { App } from 'supertest/types';
import { Reflector } from '@nestjs/core';
import { CommitteesController } from '../src/committees/committees.controller';
import { CommitteesService } from '../src/committees/committees.service';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { Role } from '../src/auth/enums/role.enum';

describe('Committee Advisors (e2e)', () => {
  let app: INestApplication<App>;

  const now = new Date('2025-06-02T12:00:00.000Z');
  const committeeId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const validAdvisorUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  const mockCommitteesService = {
    createCommittee: jest.fn(),
    getCommitteeById: jest.fn(),
    listCommitteeAdvisors: jest.fn(),
    addCommitteeAdvisor: jest.fn(),
    removeCommitteeAdvisor: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CommitteesController],
      providers: [
        { provide: CommitteesService, useValue: mockCommitteesService },
        Reflector,
        RolesGuard,
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const authHeader = req.headers.authorization as string | undefined;
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing or invalid JWT');
          }

          const roleHeader = req.headers['x-test-role'] as string | undefined;
          req.user = {
            userId: 'test-user',
            role: roleHeader ?? Role.Coordinator,
          };

          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // ─── POST /committees/{committeeId}/advisors ──────────────────────────────

  it('POST: No JWT -> 401', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/committees/${committeeId}/advisors`)
      .send({ advisorUserId: validAdvisorUserId })
      .expect(401);
  });

  it('POST: ADVISOR role -> 403', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/committees/${committeeId}/advisors`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Advisor)
      .send({ advisorUserId: validAdvisorUserId })
      .expect(403);
  });

  it('POST: TEAM_LEADER role -> 403', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/committees/${committeeId}/advisors`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.TeamLeader)
      .send({ advisorUserId: validAdvisorUserId })
      .expect(403);
  });

  it('POST: missing advisorUserId -> 400', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/committees/${committeeId}/advisors`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Coordinator)
      .send({})
      .expect(400);
  });

  it('POST: invalid UUID format -> 400', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/committees/${committeeId}/advisors`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Coordinator)
      .send({ advisorUserId: 'not-a-uuid' })
      .expect(400);
  });

  it('POST: valid COORDINATOR, valid body -> 201 with CommitteeAdvisorResponseDto', async () => {
    mockCommitteesService.addCommitteeAdvisor.mockResolvedValue({
      advisorUserId: validAdvisorUserId,
      assignedAt: now,
      assignedByUserId: 'test-user',
    });

    const response = await request(app.getHttpServer())
      .post(`/api/v1/committees/${committeeId}/advisors`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Coordinator)
      .send({ advisorUserId: validAdvisorUserId })
      .expect(201);

    expect(response.body).toHaveProperty('advisorUserId');
    expect(response.body).toHaveProperty('assignedAt');
    expect(response.body).toHaveProperty('assignedByUserId');
    expect(response.body.advisorUserId).toBe(validAdvisorUserId);
    expect(response.body.assignedByUserId).toBe('test-user');
  });

  it('POST: with custom assignedAt -> 201 uses provided timestamp', async () => {
    const customAssignedAt = '2025-06-15T14:30:00.000Z';
    mockCommitteesService.addCommitteeAdvisor.mockResolvedValue({
      advisorUserId: validAdvisorUserId,
      assignedAt: new Date(customAssignedAt),
      assignedByUserId: 'test-user',
    });

    const response = await request(app.getHttpServer())
      .post(`/api/v1/committees/${committeeId}/advisors`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Coordinator)
      .send({ advisorUserId: validAdvisorUserId, assignedAt: customAssignedAt })
      .expect(201);

    expect(response.body.assignedAt).toBe(customAssignedAt);
  });

  it('POST: advisor already linked -> 409', async () => {
    mockCommitteesService.addCommitteeAdvisor.mockRejectedValue(
      new ConflictException('Advisor is already linked to this committee.')
    );

    await request(app.getHttpServer())
      .post(`/api/v1/committees/${committeeId}/advisors`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Coordinator)
      .send({ advisorUserId: validAdvisorUserId })
      .expect(409);
  });

  it('POST: committee not found -> 404', async () => {
    mockCommitteesService.addCommitteeAdvisor.mockRejectedValue(
      new NotFoundException(`Committee with ID '${committeeId}' not found.`)
    );

    await request(app.getHttpServer())
      .post(`/api/v1/committees/${committeeId}/advisors`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Coordinator)
      .send({ advisorUserId: validAdvisorUserId })
      .expect(404);
  });

  it('POST: advisor user not found -> 404', async () => {
    mockCommitteesService.addCommitteeAdvisor.mockRejectedValue(
      new NotFoundException(`User with ID '${validAdvisorUserId}' not found.`)
    );

    await request(app.getHttpServer())
      .post(`/api/v1/committees/${committeeId}/advisors`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Coordinator)
      .send({ advisorUserId: validAdvisorUserId })
      .expect(404);
  });

  it('POST: user is not ADVISOR role -> 404', async () => {
    mockCommitteesService.addCommitteeAdvisor.mockRejectedValue(
      new NotFoundException(`User with ID '${validAdvisorUserId}' does not have ADVISOR role.`)
    );

    await request(app.getHttpServer())
      .post(`/api/v1/committees/${committeeId}/advisors`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Coordinator)
      .send({ advisorUserId: validAdvisorUserId })
      .expect(404);
  });

  it('POST: internal server error -> 500', async () => {
    mockCommitteesService.addCommitteeAdvisor.mockRejectedValue(
      new InternalServerErrorException('Unexpected database error')
    );

    await request(app.getHttpServer())
      .post(`/api/v1/committees/${committeeId}/advisors`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Coordinator)
      .send({ advisorUserId: validAdvisorUserId })
      .expect(500);
  });

  // ─── DELETE /committees/{committeeId}/advisors/{advisorUserId} ────────────

  it('DELETE: No JWT -> 401', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/committees/${committeeId}/advisors/${validAdvisorUserId}`)
      .expect(401);
  });

  it('DELETE: ADVISOR role -> 403', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/committees/${committeeId}/advisors/${validAdvisorUserId}`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Advisor)
      .expect(403);
  });

  it('DELETE: valid COORDINATOR -> 204', async () => {
    mockCommitteesService.removeCommitteeAdvisor.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .delete(`/api/v1/committees/${committeeId}/advisors/${validAdvisorUserId}`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Coordinator)
      .expect(204);
  });

  it('DELETE: advisor link not found -> 404', async () => {
    mockCommitteesService.removeCommitteeAdvisor.mockRejectedValue(
      new NotFoundException(
        `Advisor link for user '${validAdvisorUserId}' not found in committee '${committeeId}'.`
      )
    );

    await request(app.getHttpServer())
      .delete(`/api/v1/committees/${committeeId}/advisors/${validAdvisorUserId}`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Coordinator)
      .expect(404);
  });
});
