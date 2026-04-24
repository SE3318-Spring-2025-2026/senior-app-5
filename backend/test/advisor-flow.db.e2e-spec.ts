import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import { Connection, Model, Types } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { AdvisorsService } from '../src/advisors/advisors.service';
import { AdvisorRequestsController } from '../src/advisors/advisor-requests.controller';
import { SchedulesController } from '../src/advisors/schedules.controller';
import {
  AdvisorRequest,
  AdvisorRequestDocument,
  AdvisorRequestSchema,
} from '../src/advisors/schemas/advisor-request.schema';
import {
  Schedule,
  ScheduleDocument,
  SchedulePhase,
  ScheduleSchema,
} from '../src/advisors/schemas/schedule.schema';
import {
  Group,
  GroupDocument,
  GroupSchema,
  GroupStatus,
} from '../src/groups/group.entity';
import {
  Notification,
  NotificationDocument,
  NotificationSchema,
} from '../src/notifications/schemas/notification.schema';
import { NotificationsService } from '../src/notifications/notifications.service';
import { UsersService } from '../src/users/users.service';
import { User, UserDocument, UserSchema } from '../src/users/data/user.schema';

describeIfDbReady('Advisor issue 19 DB e2e', () => {
  let app: INestApplication<App>;

  const secret = 'issue19-db-test-secret';
  const mongoUri = process.env.MONGODB_URI;

  const coordinatorId = new Types.ObjectId().toHexString();
  const teamLeaderId = new Types.ObjectId().toHexString();
  const advisorId = new Types.ObjectId().toHexString();

  const coordinatorToken = jwt.sign(
    { sub: coordinatorId, email: 'coordinator@example.com' },
    secret,
    { expiresIn: '15m' },
  );
  const teamLeaderToken = jwt.sign(
    { sub: teamLeaderId, email: 'teamleader@example.com' },
    secret,
    { expiresIn: '15m' },
  );

  const users = [
    {
      _id: coordinatorId,
      email: 'coordinator@example.com',
      passwordHash: 'hash',
      role: 'COORDINATOR',
    },
    {
      _id: teamLeaderId,
      email: 'teamleader@example.com',
      passwordHash: 'hash',
      role: 'TEAM_LEADER',
    },
    {
      _id: advisorId,
      email: 'advisor@example.com',
      passwordHash: 'hash',
      role: 'ADVISOR',
    },
  ];

  function userModel() {
    return app.get<Model<UserDocument>>(getModelToken(User.name));
  }

  function groupModel() {
    return app.get<Model<GroupDocument>>(getModelToken(Group.name));
  }

  function scheduleModel() {
    return app.get<Model<ScheduleDocument>>(getModelToken(Schedule.name));
  }

  function requestModel() {
    return app.get<Model<AdvisorRequestDocument>>(
      getModelToken(AdvisorRequest.name),
    );
  }

  function notificationModel() {
    return app.get<Model<NotificationDocument>>(
      getModelToken(Notification.name),
    );
  }

  async function resetCollections() {
    await Promise.all([
      userModel().deleteMany({}),
      groupModel().deleteMany({}),
      scheduleModel().deleteMany({}),
      requestModel().deleteMany({}),
      notificationModel().deleteMany({}),
    ]);
  }

  async function seedBaseData() {
    await userModel().insertMany(users);
    await groupModel().create({
      groupName: 'DB Test Group',
      leaderUserId: teamLeaderId,
      status: GroupStatus.ACTIVE,
    });
  }

  beforeAll(async () => {
    if (!mongoUri) {
      throw new Error('MONGODB_URI must be set to run DB-backed e2e tests.');
    }

    process.env.JWT_ACCESS_SECRET = secret;
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: Group.name, schema: GroupSchema },
          { name: Schedule.name, schema: ScheduleSchema },
          { name: AdvisorRequest.name, schema: AdvisorRequestSchema },
          { name: Notification.name, schema: NotificationSchema },
        ]),
      ],
      controllers: [SchedulesController, AdvisorRequestsController],
      providers: [
        AdvisorsService,
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue(secret),
          },
        },
        UsersService,
        NotificationsService,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  beforeEach(async () => {
    await resetCollections();
    await seedBaseData();
  });

  afterEach(async () => {
    await resetCollections();
  });

  afterAll(async () => {
    if (!app) {
      return;
    }

    const connection = app.get<Connection>(getConnectionToken());
    await connection.close();
    await app.close();
  });

  it('creates a schedule and returns the active schedule from the real database', async () => {
    const setResponse = await request(app.getHttpServer())
      .post('/api/v1/schedules')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        phase: SchedulePhase.ADVISOR_SELECTION,
        startDatetime: new Date(Date.now() - 60_000).toISOString(),
        endDatetime: new Date(Date.now() + 60_000).toISOString(),
      })
      .expect(201);

    const createdSchedule = setResponse.body as {
      scheduleId: string;
      coordinatorId: string;
      phase: SchedulePhase;
    };

    expect(createdSchedule.phase).toBe(SchedulePhase.ADVISOR_SELECTION);
    expect(createdSchedule.coordinatorId).toBe(coordinatorId);

    const activeResponse = await request(app.getHttpServer())
      .get('/api/v1/schedules/active?phase=ADVISOR_SELECTION')
      .set('Authorization', `Bearer ${teamLeaderToken}`)
      .expect(200);

    const activeSchedule = activeResponse.body as {
      scheduleId: string;
      phase: SchedulePhase;
      isOpen: boolean;
    };

    expect(activeSchedule.phase).toBe(SchedulePhase.ADVISOR_SELECTION);
    expect(activeSchedule.isOpen).toBe(true);
  });

  it('returns 404 when no active schedule exists for the requested phase', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/schedules/active?phase=COMMITTEE_ASSIGNMENT')
      .set('Authorization', `Bearer ${teamLeaderToken}`)
      .expect(404);
  });

  it('submits an advisor request and rejects a duplicate submission', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/schedules')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        phase: SchedulePhase.ADVISOR_SELECTION,
        startDatetime: new Date(Date.now() - 60_000).toISOString(),
        endDatetime: new Date(Date.now() + 60_000).toISOString(),
      })
      .expect(201);

    const firstResponse = await request(app.getHttpServer())
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${teamLeaderToken}`)
      .send({ requestedAdvisorId: advisorId })
      .expect(201);

    const firstRequest = firstResponse.body as {
      requestedAdvisorId: string;
      status: string;
      groupId: string;
    };

    expect(firstRequest.requestedAdvisorId).toBe(advisorId);
    expect(firstRequest.status).toBe('PENDING');

    await request(app.getHttpServer())
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${teamLeaderToken}`)
      .send({ requestedAdvisorId: advisorId })
      .expect(409);

    expect(
      await requestModel().countDocuments({ requestedAdvisorId: advisorId }),
    ).toBe(1);
    const storedRequest = await requestModel().findOne({
      requestedAdvisorId: advisorId,
    });
    expect(storedRequest?.groupId).toBeDefined();
    expect(
      await notificationModel().countDocuments({ recipientUserId: advisorId }),
    ).toBe(1);
  });

  it('overrides the active schedule for the same phase', async () => {
    const firstResponse = await request(app.getHttpServer())
      .post('/api/v1/schedules')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        phase: SchedulePhase.ADVISOR_SELECTION,
        startDatetime: new Date(Date.now() - 120_000).toISOString(),
        endDatetime: new Date(Date.now() - 60_000).toISOString(),
      })
      .expect(201);

    const secondResponse = await request(app.getHttpServer())
      .post('/api/v1/schedules')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        phase: SchedulePhase.ADVISOR_SELECTION,
        startDatetime: new Date(Date.now() - 60_000).toISOString(),
        endDatetime: new Date(Date.now() + 60_000).toISOString(),
      })
      .expect(201);

    const firstSchedule = firstResponse.body as { scheduleId: string };
    const secondSchedule = secondResponse.body as { scheduleId: string };

    expect(firstSchedule.scheduleId).not.toBe(secondSchedule.scheduleId);

    const activeResponse = await request(app.getHttpServer())
      .get('/api/v1/schedules/active?phase=ADVISOR_SELECTION')
      .set('Authorization', `Bearer ${teamLeaderToken}`)
      .expect(200);

    const activeSchedule = activeResponse.body as {
      scheduleId: string;
      isOpen: boolean;
    };

    expect(activeSchedule.scheduleId).toBe(secondSchedule.scheduleId);
    expect(activeSchedule.isOpen).toBe(true);
  });
});

function describeIfDbReady(title: string, suite: () => void) {
  if (!process.env.MONGODB_URI) {
    return describe.skip(title, suite);
  }

  return describe(title, suite);
}
