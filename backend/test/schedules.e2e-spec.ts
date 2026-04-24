import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { App } from 'supertest/types';
import * as jwt from 'jsonwebtoken';
import { AdvisorsService } from '../src/advisors/advisors.service';
import { SchedulesController } from '../src/advisors/schedules.controller';
import { SchedulePhase } from '../src/advisors/schemas/schedule.schema';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { Role } from '../src/auth/enums/role.enum';
import { UsersService } from '../src/users/users.service';
import { NotFoundException } from '@nestjs/common';

describe('Schedules (e2e)', () => {
  let app: INestApplication<App>;
  const secret = 'test-access-secret';

  const mockAdvisorsService = {
    setSchedule: jest.fn().mockResolvedValue({
      scheduleId: 'schedule-1',
      coordinatorId: 'coordinator-id',
      phase: SchedulePhase.ADVISOR_SELECTION,
      startDatetime: '2026-04-14T10:00:00.000Z',
      endDatetime: '2026-04-14T12:00:00.000Z',
      createdAt: '2026-04-14T09:00:00.000Z',
    }),
    getActiveSchedule: jest.fn().mockResolvedValue({
      scheduleId: 'schedule-1',
      coordinatorId: 'coordinator-id',
      phase: SchedulePhase.ADVISOR_SELECTION,
      startDatetime: '2026-04-14T10:00:00.000Z',
      endDatetime: '2026-04-14T12:00:00.000Z',
      isOpen: true,
      createdAt: '2026-04-14T09:00:00.000Z',
    }),
  };

  const usersById = new Map<string, { role: string }>([
    ['team-leader-id', { role: Role.TeamLeader }],
    ['coordinator-id', { role: Role.Coordinator }],
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
      controllers: [SchedulesController],
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

  it('POST /schedules should return 401 when missing bearer token', () => {
    return request(app.getHttpServer())
      .post('/schedules')
      .send({
        phase: SchedulePhase.ADVISOR_SELECTION,
        startDatetime: '2026-04-14T10:00:00.000Z',
        endDatetime: '2026-04-14T12:00:00.000Z',
      })
      .expect(401);
  });

  it('POST /schedules should return 403 for non-coordinator roles', () => {
    const token = createToken('team-leader-id');

    return request(app.getHttpServer())
      .post('/schedules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        phase: SchedulePhase.ADVISOR_SELECTION,
        startDatetime: '2026-04-14T10:00:00.000Z',
        endDatetime: '2026-04-14T12:00:00.000Z',
      })
      .expect(403);
  });

  it('POST /schedules should return 201 for valid coordinator payload', async () => {
    const token = createToken('coordinator-id');

    const response = await request(app.getHttpServer())
      .post('/schedules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        phase: SchedulePhase.ADVISOR_SELECTION,
        startDatetime: '2026-04-14T10:00:00.000Z',
        endDatetime: '2026-04-14T12:00:00.000Z',
      })
      .expect(201);

    expect(mockAdvisorsService.setSchedule).toHaveBeenCalledWith({
      phase: SchedulePhase.ADVISOR_SELECTION,
      startDatetime: '2026-04-14T10:00:00.000Z',
      endDatetime: '2026-04-14T12:00:00.000Z',
      coordinatorId: 'coordinator-id',
    });
    expect(response.body).toEqual({
      scheduleId: 'schedule-1',
      coordinatorId: 'coordinator-id',
      phase: SchedulePhase.ADVISOR_SELECTION,
      startDatetime: '2026-04-14T10:00:00.000Z',
      endDatetime: '2026-04-14T12:00:00.000Z',
      createdAt: '2026-04-14T09:00:00.000Z',
    });
  });

  it('GET /schedules/active should return 400 for invalid phase query', () => {
    const token = createToken('coordinator-id');

    return request(app.getHttpServer())
      .get('/schedules/active?phase=INVALID')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('GET /schedules/active should return 200 for valid phase query', async () => {
    const token = createToken('team-leader-id');

    const response = await request(app.getHttpServer())
      .get('/schedules/active?phase=ADVISOR_SELECTION')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(mockAdvisorsService.getActiveSchedule).toHaveBeenCalledWith(
      SchedulePhase.ADVISOR_SELECTION,
    );
    expect(response.body).toEqual({
      scheduleId: 'schedule-1',
      coordinatorId: 'coordinator-id',
      phase: SchedulePhase.ADVISOR_SELECTION,
      startDatetime: '2026-04-14T10:00:00.000Z',
      endDatetime: '2026-04-14T12:00:00.000Z',
      isOpen: true,
      createdAt: '2026-04-14T09:00:00.000Z',
    });
  });

  it('GET /schedules/active should return 401 when missing bearer token', () => {
    return request(app.getHttpServer())
      .get('/schedules/active?phase=ADVISOR_SELECTION')
      .expect(401);
  });

  it('GET /schedules/active should return 404 when no schedule exists', async () => {
    const token = createToken('team-leader-id');
    mockAdvisorsService.getActiveSchedule.mockRejectedValueOnce(
      new NotFoundException('No schedule found for phase ADVISOR_SELECTION.'),
    );

    return request(app.getHttpServer())
      .get('/schedules/active?phase=ADVISOR_SELECTION')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('POST /schedules should return 500 on unexpected errors', async () => {
    const token = createToken('coordinator-id');
    mockAdvisorsService.setSchedule.mockRejectedValueOnce(new Error('boom'));

    return request(app.getHttpServer())
      .post('/schedules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        phase: SchedulePhase.ADVISOR_SELECTION,
        startDatetime: '2026-04-14T10:00:00.000Z',
        endDatetime: '2026-04-14T12:00:00.000Z',
      })
      .expect(500);
  });
});
