import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { App } from 'supertest/types';
import * as jwt from 'jsonwebtoken';
import { AdminController } from '../src/admin/admin.controller';
import { AdminService } from '../src/admin/admin.service';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { Role } from '../src/auth/enums/role.enum';
import { UsersService } from '../src/users/users.service';

describe('Admin Activity Logs (e2e)', () => {
  let app: INestApplication<App>;
  const secret = 'test-access-secret';

  const samplePayload = {
    data: [
      {
        id: '6500000000000000000000aa',
        timestamp: new Date('2026-01-01T00:00:00Z').toISOString(),
        eventType: 'auth.login',
        actorUserId: '6500000000000000000000bb',
        actorRole: 'Admin',
        targetType: null,
        targetId: null,
        summary: 'admin signed in',
        metadata: { token: '[REDACTED]' },
      },
    ],
    page: 1,
    limit: 20,
    total: 1,
  };

  const mockAdminService = {
    getActivityLogs: jest.fn().mockResolvedValue(samplePayload),
  };

  const usersById = new Map<string, { role: string }>([
    ['admin-id', { role: Role.Admin }],
    ['coordinator-id', { role: Role.Coordinator }],
    ['student-id', { role: Role.Student }],
  ]);

  const mockUsersService = {
    findById: jest.fn((id: string) => Promise.resolve(usersById.get(id))),
  };

  function createToken(sub: string) {
    return jwt.sign({ sub, email: `${sub}@example.com` }, secret, {
      expiresIn: '15m',
    });
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue(secret) },
        },
        { provide: UsersService, useValue: mockUsersService },
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

  it('GET /admin/activity returns 401 without bearer token', () => {
    return request(app.getHttpServer()).get('/admin/activity').expect(401);
  });

  it('GET /admin/activity returns 403 for student', () => {
    const token = createToken('student-id');
    return request(app.getHttpServer())
      .get('/admin/activity')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('GET /admin/activity returns 200 and paginated payload for Admin', async () => {
    const token = createToken('admin-id');
    const res = await request(app.getHttpServer())
      .get('/admin/activity?page=1&limit=20')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual(JSON.parse(JSON.stringify(samplePayload)));
    expect(mockAdminService.getActivityLogs).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
    );
  });

  it('GET /admin/activity returns 200 for Coordinator', () => {
    const token = createToken('coordinator-id');
    return request(app.getHttpServer())
      .get('/admin/activity')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('GET /admin/activity returns 400 for invalid pagination', () => {
    const token = createToken('admin-id');
    return request(app.getHttpServer())
      .get('/admin/activity?page=0&limit=500')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('GET /admin/activity returns 400 for malformed date', () => {
    const token = createToken('admin-id');
    return request(app.getHttpServer())
      .get('/admin/activity?from=not-a-date')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });
});
