import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
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
  const validAdvisorId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  const mockCommitteesService = {
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

  it('POST No JWT -> 401', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/committees/${committeeId}/advisors`)
      .send({ advisorUserId: validAdvisorId })
      .expect(401);
  });

  it('POST ADVISOR role -> 403', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/committees/${committeeId}/advisors`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Professor)
      .send({ advisorUserId: validAdvisorId })
      .expect(403);
  });

  it('POST TEAM_LEADER role -> 403', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/committees/${committeeId}/advisors`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.TeamLeader)
      .send({ advisorUserId: validAdvisorId })
      .expect(403);
  });

  it('POST missing advisorUserId -> 400', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/committees/${committeeId}/advisors`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Coordinator)
      .send({})
      .expect(400);
  });

  it('POST assignedByUserId in body is ignored (not mapped by DTO/service)', async () => {
    mockCommitteesService.addCommitteeAdvisor.mockResolvedValue({
      advisorUserId: validAdvisorId,
      assignedAt: now,
      assignedByUserId: 'test-user', // Should come from JWT, not body
    });

    const response = await request(app.getHttpServer())
      .post(`/api/v1/committees/${committeeId}/advisors`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Coordinator)
      .send({ advisorUserId: validAdvisorId, assignedByUserId: 'malicious-user' })
      .expect(201);

    expect(response.body).toEqual({
      advisorUserId: validAdvisorId,
      assignedAt: now.toISOString(),
      assignedByUserId: 'test-user',
    });

    expect(mockCommitteesService.addCommitteeAdvisor).toHaveBeenCalledWith(
      committeeId,
      expect.not.objectContaining({ assignedByUserId: 'malicious-user' }),
      'test-user',
      undefined,
    );
  });

  it('POST valid COORDINATOR, valid body -> 201 with CommitteeAdvisorResponse', async () => {
    mockCommitteesService.addCommitteeAdvisor.mockResolvedValue({
      advisorUserId: validAdvisorId,
      assignedAt: now,
      assignedByUserId: 'test-user',
    });

    const response = await request(app.getHttpServer())
      .post(`/api/v1/committees/${committeeId}/advisors`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Coordinator)
      .send({ advisorUserId: validAdvisorId })
      .expect(201);

    expect(response.body).toEqual({
      advisorUserId: validAdvisorId,
      assignedAt: now.toISOString(),
      assignedByUserId: 'test-user',
    });

    expect(mockCommitteesService.addCommitteeAdvisor).toHaveBeenCalledWith(
      committeeId,
      { advisorUserId: validAdvisorId },
      'test-user',
      undefined,
    );
  });
});
