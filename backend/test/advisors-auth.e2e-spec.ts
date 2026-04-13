import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { App } from 'supertest/types';
import * as jwt from 'jsonwebtoken';
import { AdvisorsController } from '../src/advisors/advisors.controller';
import { AdvisorsService } from '../src/advisors/advisors.service';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { UsersService } from '../src/users/users.service';

describe('Advisors Auth (e2e)', () => {
  let app: INestApplication<App>;
  const secret = 'test-access-secret';

  const mockAdvisorsService = {
    listAdvisors: jest.fn().mockResolvedValue({
      data: [
        {
          advisorId: 'advisor-1',
          name: 'advisor@example.com',
          email: 'advisor@example.com',
          role: 'ADVISOR',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    }),
  };

  const usersById = new Map<string, { role: string }>([
    ['team-leader-id', { role: 'TEAM_LEADER' }],
    ['coordinator-id', { role: 'COORDINATOR' }],
    ['student-id', { role: 'STUDENT' }],
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

  it('GET /advisors should return 401 when missing bearer token', () => {
    return request(app.getHttpServer()).get('/advisors').expect(401);
  });

  it('GET /advisors should return 403 for authenticated non-authorized roles', () => {
    const token = createToken('student-id');

    return request(app.getHttpServer())
      .get('/advisors')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('GET /advisors should return paginated advisors for team leader', async () => {
    const token = createToken('team-leader-id');

    const response = await request(app.getHttpServer())
      .get('/advisors?page=1&limit=20')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      data: [
        {
          advisorId: 'advisor-1',
          name: 'advisor@example.com',
          email: 'advisor@example.com',
          role: 'ADVISOR',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
    expect(mockAdvisorsService.listAdvisors).toHaveBeenCalled();
  });

  it('GET /advisors should return empty paginated result when no advisors are found', async () => {
    const token = createToken('coordinator-id');
    mockAdvisorsService.listAdvisors.mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    const response = await request(app.getHttpServer())
      .get('/advisors?page=1&limit=20')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });
  });

  it('GET /advisors should return 400 for invalid pagination query', () => {
    const token = createToken('team-leader-id');

    return request(app.getHttpServer())
      .get('/advisors?page=0&limit=101')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });
});
