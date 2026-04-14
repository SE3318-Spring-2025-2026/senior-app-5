import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { App } from 'supertest/types';
import * as jwt from 'jsonwebtoken';
import { AdvisorRequestsController } from '../src/advisors/advisor-requests.controller';
import { AdvisorsService } from '../src/advisors/advisors.service';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { UsersService } from '../src/users/users.service';

describe('Advisor Requests (e2e)', () => {
  let app: INestApplication<App>;
  const secret = 'test-access-secret';

  const mockAdvisorsService = {
    submitRequest: jest.fn().mockResolvedValue({
      requestId: 'request-1',
      groupId: 'group-1',
      submittedBy: 'team-leader-id',
      requestedAdvisorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      status: 'PENDING',
    }),
  };

  const usersById = new Map<string, { role: string }>([
    ['team-leader-id', { role: 'TEAM_LEADER' }],
    ['coordinator-id', { role: 'COORDINATOR' }],
    ['advisor-id', { role: 'ADVISOR' }],
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
      controllers: [AdvisorRequestsController],
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

  it('POST /requests should return 401 when missing bearer token', () => {
    return request(app.getHttpServer())
      .post('/requests')
      .send({ requestedAdvisorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
      .expect(401);
  });

  it('POST /requests should return 403 for authenticated non-team-leader roles', () => {
    const token = createToken('coordinator-id');

    return request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ requestedAdvisorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
      .expect(403);
  });

  it('POST /requests should return 400 for invalid advisor id', () => {
    const token = createToken('team-leader-id');

    return request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ requestedAdvisorId: 'not-a-uuid' })
      .expect(400);
  });

  it('POST /requests should return 201 for valid team leader and body', async () => {
    const token = createToken('team-leader-id');

    const response = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ requestedAdvisorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
      .expect(201);

    expect(mockAdvisorsService.submitRequest).toHaveBeenCalledWith({
      requestedAdvisorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      submittedBy: 'team-leader-id',
    });
    expect(response.body).toEqual({
      requestId: 'request-1',
      groupId: 'group-1',
      submittedBy: 'team-leader-id',
      requestedAdvisorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      status: 'PENDING',
    });
  });
});
