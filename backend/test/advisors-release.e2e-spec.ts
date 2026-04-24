import {
  ForbiddenException,
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
import { AdvisorsController } from '../src/advisors/advisors.controller';
import { AdvisorsService } from '../src/advisors/advisors.service';
import { Role } from '../src/auth/enums/role.enum';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { UsersService } from '../src/users/users.service';

describe('Advisors Release Team (e2e)', () => {
  let app: INestApplication<App>;
  const secret = 'release-team-e2e-secret';
  const advisorUserId = '507f191e810c19729de860ea';
  const groupId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  const mockAdvisorsService = {
    listAdvisors: jest.fn().mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    }),
    releaseTeam: jest.fn().mockResolvedValue({
      groupId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      status: 'UNASSIGNED',
      advisorId: null,
      advisorName: null,
      canSubmitRequest: true,
      blockedReason: null,
      updatedAt: '2026-04-16T00:00:00.000Z',
    }),
  };

  const usersById = new Map<string, { role: string }>([
    ['coordinator-id', { role: Role.Coordinator }],
    [advisorUserId, { role: Role.Professor }],
    ['team-leader-id', { role: Role.TeamLeader }],
  ]);

  const mockUsersService = {
    findById: jest.fn((id: string) => Promise.resolve(usersById.get(id))),
  };

  function createToken(sub: string, email = 'user@example.com') {
    return jwt.sign({ sub, email }, secret, { expiresIn: '15m' });
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [AdvisorsController],
      providers: [
        {
          provide: AdvisorsService,
          useValue: mockAdvisorsService,
        },
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue(secret),
          },
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('DELETE /advisors/:advisorId/groups/:groupId should return 401 when missing bearer token', () => {
    return request(app.getHttpServer())
      .delete(
        '/advisors/507f191e810c19729de860ea/groups/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      )
      .expect(401);
  });

  it('DELETE /advisors/:advisorId/groups/:groupId should return 403 for non-coordinator/non-advisor role', () => {
    const token = createToken('team-leader-id');

    return request(app.getHttpServer())
      .delete(
        '/advisors/507f191e810c19729de860ea/groups/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('DELETE /advisors/:advisorId/groups/:groupId should return 400 for invalid advisorId', () => {
    const token = createToken('coordinator-id');

    return request(app.getHttpServer())
      .delete(
        '/advisors/not-a-uuid/groups/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('DELETE /advisors/:advisorId/groups/:groupId should return 200 for coordinator', async () => {
    const token = createToken('coordinator-id');

    const response = await request(app.getHttpServer())
      .delete(
        '/advisors/507f191e810c19729de860ea/groups/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(mockAdvisorsService.releaseTeam).toHaveBeenCalledWith({
      advisorId: '507f191e810c19729de860ea',
      groupId,
      callerId: 'coordinator-id',
      callerRole: Role.Coordinator,
    });
    expect(response.body).toEqual({
      groupId,
      status: 'UNASSIGNED',
      advisorId: null,
      advisorName: null,
      canSubmitRequest: true,
      blockedReason: null,
      updatedAt: '2026-04-16T00:00:00.000Z',
    });
  });

  it('DELETE /advisors/:advisorId/groups/:groupId should return 200 for advisor releasing own group', async () => {
    const token = createToken(advisorUserId);

    await request(app.getHttpServer())
      .delete(`/advisors/${advisorUserId}/groups/${groupId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('DELETE /advisors/:advisorId/groups/:groupId should return 403 for advisor ownership mismatch', () => {
    const token = createToken(advisorUserId);
    mockAdvisorsService.releaseTeam.mockRejectedValueOnce(
      new ForbiddenException(
        'You are not allowed to release another advisor assignment.',
      ),
    );

    return request(app.getHttpServer())
      .delete(
        '/advisors/507f191e810c19729de860ea/groups/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('DELETE /advisors/:advisorId/groups/:groupId should return 404 when association is not found', () => {
    const token = createToken('coordinator-id');
    mockAdvisorsService.releaseTeam.mockRejectedValueOnce(
      new NotFoundException('Advisor-group association was not found.'),
    );

    return request(app.getHttpServer())
      .delete(
        '/advisors/507f191e810c19729de860ea/groups/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});
