import { INestApplication, ValidationPipe } from '@nestjs/common';
import {
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { App } from 'supertest/types';
import * as jwt from 'jsonwebtoken';
import { AdvisorRequestsController } from '../src/advisors/advisor-requests.controller';
import { AdvisorsService } from '../src/advisors/advisors.service';
import { AdvisorDecision } from '../src/advisors/dto/decision-request.dto';
import { WithdrawRequestStatus } from '../src/advisors/dto/update-request-status.dto';
import { Role } from '../src/auth/enums/role.enum';
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
      requestedAdvisorId: '507f191e810c19729de860ea',
      status: 'PENDING',
    }),
    decideRequest: jest.fn().mockResolvedValue({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      groupId: 'group-1',
      submittedBy: 'team-leader-id',
      requestedAdvisorId: 'advisor-id',
      status: 'APPROVED',
    }),
    withdrawRequest: jest.fn().mockResolvedValue({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      groupId: 'group-1',
      submittedBy: 'team-leader-id',
      requestedAdvisorId: 'advisor-id',
      status: 'WITHDRAWN',
    }),
  };

  const usersById = new Map<string, { role: string }>([
    ['team-leader-id', { role: Role.TeamLeader }],
    ['coordinator-id', { role: Role.Coordinator }],
    ['advisor-id', { role: Role.Professor }],
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
      .send({ requestedAdvisorId: '507f191e810c19729de860ea' })
      .expect(401);
  });

  it('POST /requests should return 403 for authenticated non-team-leader roles', () => {
    const token = createToken('coordinator-id');

    return request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ requestedAdvisorId: '507f191e810c19729de860ea' })
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
      .send({ requestedAdvisorId: '507f191e810c19729de860ea' })
      .expect(201);

    expect(mockAdvisorsService.submitRequest).toHaveBeenCalledWith({
      requestedAdvisorId: '507f191e810c19729de860ea',
      submittedBy: 'team-leader-id',
    });
    expect(response.body).toEqual({
      requestId: 'request-1',
      groupId: 'group-1',
      submittedBy: 'team-leader-id',
      requestedAdvisorId: '507f191e810c19729de860ea',
      status: 'PENDING',
    });
  });

  it('POST /requests should return 403 when schedule window is closed', () => {
    const token = createToken('team-leader-id');
    mockAdvisorsService.submitRequest.mockRejectedValueOnce(
      new ForbiddenException(
        'Advisor selection schedule window is not currently open.',
      ),
    );

    return request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ requestedAdvisorId: '507f191e810c19729de860ea' })
      .expect(403);
  });

  it('POST /requests should return 404 when advisor is not found', () => {
    const token = createToken('team-leader-id');
    mockAdvisorsService.submitRequest.mockRejectedValueOnce(
      new NotFoundException('Requested advisor was not found.'),
    );

    return request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ requestedAdvisorId: '507f191e810c19729de860ea' })
      .expect(404);
  });

  it('POST /requests should return 409 when duplicate pending request exists', () => {
    const token = createToken('team-leader-id');
    mockAdvisorsService.submitRequest.mockRejectedValueOnce(
      new ConflictException(
        'A pending advisor request already exists for this group.',
      ),
    );

    return request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ requestedAdvisorId: '507f191e810c19729de860ea' })
      .expect(409);
  });

  it('POST /requests should return 423 when group is already assigned', () => {
    const token = createToken('team-leader-id');
    mockAdvisorsService.submitRequest.mockRejectedValueOnce(
      new HttpException('Group is already assigned to an advisor.', 423),
    );

    return request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ requestedAdvisorId: '507f191e810c19729de860ea' })
      .expect(423);
  });

  it('POST /requests should return 500 on unexpected errors', () => {
    const token = createToken('team-leader-id');
    mockAdvisorsService.submitRequest.mockRejectedValueOnce(new Error('boom'));

    return request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ requestedAdvisorId: '507f191e810c19729de860ea' })
      .expect(500);
  });

  it('PATCH /requests/:requestId/decision should return 401 when missing bearer token', () => {
    return request(app.getHttpServer())
      .patch('/requests/f47ac10b-58cc-4372-a567-0e02b2c3d479/decision')
      .send({ decision: AdvisorDecision.APPROVE })
      .expect(401);
  });

  it('PATCH /requests/:requestId/decision should return 403 for non-advisor role', () => {
    const token = createToken('team-leader-id');

    return request(app.getHttpServer())
      .patch('/requests/f47ac10b-58cc-4372-a567-0e02b2c3d479/decision')
      .set('Authorization', `Bearer ${token}`)
      .send({ decision: AdvisorDecision.APPROVE })
      .expect(403);
  });

  it('PATCH /requests/:requestId/decision should return 400 for invalid decision value', () => {
    const token = createToken('advisor-id');

    return request(app.getHttpServer())
      .patch('/requests/f47ac10b-58cc-4372-a567-0e02b2c3d479/decision')
      .set('Authorization', `Bearer ${token}`)
      .send({ decision: 'INVALID' })
      .expect(400);
  });

  it('PATCH /requests/:requestId/decision should return 400 for invalid request id', () => {
    const token = createToken('advisor-id');

    return request(app.getHttpServer())
      .patch('/requests/not-a-uuid/decision')
      .set('Authorization', `Bearer ${token}`)
      .send({ decision: AdvisorDecision.APPROVE })
      .expect(400);
  });

  it('PATCH /requests/:requestId/decision should return 200 for valid advisor decision', async () => {
    const token = createToken('advisor-id');

    const response = await request(app.getHttpServer())
      .patch('/requests/f47ac10b-58cc-4372-a567-0e02b2c3d479/decision')
      .set('Authorization', `Bearer ${token}`)
      .send({ decision: AdvisorDecision.APPROVE })
      .expect(200);

    expect(mockAdvisorsService.decideRequest).toHaveBeenCalledWith({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      advisorId: 'advisor-id',
      decision: AdvisorDecision.APPROVE,
    });
    expect(response.body).toEqual({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      groupId: 'group-1',
      submittedBy: 'team-leader-id',
      requestedAdvisorId: 'advisor-id',
      status: 'APPROVED',
    });
  });

  it('PATCH /requests/:requestId should return 401 when missing bearer token', () => {
    return request(app.getHttpServer())
      .patch('/requests/f47ac10b-58cc-4372-a567-0e02b2c3d479')
      .send({ status: WithdrawRequestStatus.WITHDRAWN })
      .expect(401);
  });

  it('PATCH /requests/:requestId should return 403 for non-team-leader role', () => {
    const token = createToken('advisor-id');

    return request(app.getHttpServer())
      .patch('/requests/f47ac10b-58cc-4372-a567-0e02b2c3d479')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: WithdrawRequestStatus.WITHDRAWN })
      .expect(403);
  });

  it('PATCH /requests/:requestId should return 400 for invalid request id', () => {
    const token = createToken('team-leader-id');

    return request(app.getHttpServer())
      .patch('/requests/not-a-uuid')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: WithdrawRequestStatus.WITHDRAWN })
      .expect(400);
  });

  it('PATCH /requests/:requestId should return 404 when request is not found', () => {
    const token = createToken('team-leader-id');
    mockAdvisorsService.withdrawRequest.mockRejectedValueOnce(
      new NotFoundException('Advisor request was not found.'),
    );

    return request(app.getHttpServer())
      .patch('/requests/f47ac10b-58cc-4372-a567-0e02b2c3d479')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: WithdrawRequestStatus.WITHDRAWN })
      .expect(404);
  });

  it('PATCH /requests/:requestId should return 409 when request is not pending', () => {
    const token = createToken('team-leader-id');
    mockAdvisorsService.withdrawRequest.mockRejectedValueOnce(
      new ConflictException('Advisor request is not in a pending state.'),
    );

    return request(app.getHttpServer())
      .patch('/requests/f47ac10b-58cc-4372-a567-0e02b2c3d479')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: WithdrawRequestStatus.WITHDRAWN })
      .expect(409);
  });

  it('PATCH /requests/:requestId should return 403 when caller is not the submitter', () => {
    const token = createToken('team-leader-id');
    mockAdvisorsService.withdrawRequest.mockRejectedValueOnce(
      new ForbiddenException(
        'You are not allowed to withdraw this advisor request.',
      ),
    );

    return request(app.getHttpServer())
      .patch('/requests/f47ac10b-58cc-4372-a567-0e02b2c3d479')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: WithdrawRequestStatus.WITHDRAWN })
      .expect(403);
  });

  it('PATCH /requests/:requestId should return 200 for valid team leader withdraw', async () => {
    const token = createToken('team-leader-id');

    const response = await request(app.getHttpServer())
      .patch('/requests/f47ac10b-58cc-4372-a567-0e02b2c3d479')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: WithdrawRequestStatus.WITHDRAWN })
      .expect(200);

    expect(mockAdvisorsService.withdrawRequest).toHaveBeenCalledWith({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      teamLeaderId: 'team-leader-id',
    });
    expect(response.body).toEqual({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      groupId: 'group-1',
      submittedBy: 'team-leader-id',
      requestedAdvisorId: 'advisor-id',
      status: 'WITHDRAWN',
    });
  });
});
