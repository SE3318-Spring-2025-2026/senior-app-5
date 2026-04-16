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

describe('Committee Groups (e2e)', () => {
  let app: INestApplication<App>;

  const now = new Date('2025-06-02T12:00:00.000Z');
  const committeeId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  const mockCommitteesService = {
    createCommittee: jest.fn(),
    getCommitteeById: jest.fn(),
    getCommitteeByGroupId: jest.fn(),
    listCommitteeGroups: jest.fn(),
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

  it('No JWT -> 401', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/committees/${committeeId}/groups`)
      .expect(401);
  });

  it('ADVISOR role -> 403', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/committees/${committeeId}/groups`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Professor)
      .expect(403);
  });

  it('TEAM_LEADER role -> 403', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/committees/${committeeId}/groups`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.TeamLeader)
      .expect(403);
  });

  it('COORDINATOR role -> 200 with CommitteeGroupPage shape and defaults', async () => {
    mockCommitteesService.listCommitteeGroups.mockResolvedValue({
      data: [
        { groupId: 'group-1', assignedAt: now, assignedByUserId: 'coord-1' },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    const response = await request(app.getHttpServer())
      .get(`/api/v1/committees/${committeeId}/groups`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Coordinator)
      .expect(200);

    expect(response.body).toEqual({
      data: [
        {
          groupId: 'group-1',
          assignedAt: now.toISOString(),
          assignedByUserId: 'coord-1',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    expect(response.body.data[0]).not.toHaveProperty('committeeId');

    expect(mockCommitteesService.listCommitteeGroups).toHaveBeenCalledWith(
      committeeId,
      expect.objectContaining({ page: 1, limit: 20 }),
      undefined,
    );
  });
});
