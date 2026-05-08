import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { JwtAuthGuard } from './../src/auth/guards/jwt-auth.guard';

describe('Group Lifecycle E2E (Process 3) - Happy Path', () => {
  let app: INestApplication;
  
  let groupId: string;
  let requestId: string;
  
  
  let leaderUserId: string;
  let memberUserId: string;
  let professorId: string;

  
  const coordinatorToken = 'Bearer MOCK_COORDINATOR';
  const teamLeaderToken = 'Bearer MOCK_TEAM_LEADER';
  const professorToken = 'Bearer MOCK_PROFESSOR';

  let userModel: Model<any>;
  let groupModel: Model<any>;
  let requestModel: Model<any>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: (context: ExecutionContext) => {
        const req = context.switchToHttp().getRequest();
        const auth = req.headers.authorization;
        if (auth === coordinatorToken) {
          req.user = { userId: 'mock-coord', role: 'Coordinator' };
        } else if (auth === teamLeaderToken) {
          req.user = { userId: leaderUserId, role: 'TeamLeader' };
        } else if (auth === professorToken) {
          req.user = { userId: professorId, role: 'Professor' };
        } else {
          return false; 
        }
        return true;
      },
    })
    .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

   
    userModel = moduleFixture.get<Model<any>>(getModelToken('User'));
    groupModel = moduleFixture.get<Model<any>>(getModelToken('Group'));
    requestModel = moduleFixture.get<Model<any>>('AdvisorRequestModel'); 

    
    await userModel.deleteMany({ email: { $regex: '@e2e.test' } });

   
    const leader = await userModel.create({ 
      name: 'E2E Leader', 
      email: 'leader@e2e.test', 
      role: 'Student', 
      passwordHash: 'dummy_hash' 
    });
    leaderUserId = leader._id.toString();

   
    const member = await userModel.create({ 
      name: 'E2E Member', 
      email: 'member@e2e.test', 
      role: 'Student', 
      passwordHash: 'dummy_hash'
    });
    memberUserId = member._id.toString();

    
    const prof = await userModel.create({ 
      name: 'E2E Professor', 
      email: 'prof@e2e.test', 
      role: 'Professor', 
      passwordHash: 'dummy_hash'
    });
    professorId = prof._id.toString();
  });

  afterAll(async () => {
    await userModel.deleteMany({ email: { $regex: '@e2e.test' } });
    if (groupId) {
      await groupModel.deleteMany({ groupId: groupId });
      await requestModel.deleteMany({ groupId: groupId });
    }
    
    await app.close();
  });

  it('Phase 0: Set active schedule as Coordinator', async () => {
    await request(app.getHttpServer())
      .post('/schedules')
      .set('Authorization', coordinatorToken)
      .send({
        phase: 'ADVISOR_SELECTION',
        startDatetime: new Date(Date.now() - 86400000).toISOString(), 
        endDatetime: new Date(Date.now() + 86400000).toISOString(),   
      })
      .expect(201);
  });

  it('Phase 1.1: Create a group as Coordinator', async () => {
    const response = await request(app.getHttpServer())
      .post('/groups')
      .set('Authorization', coordinatorToken)
      .send({
        groupName: 'QA E2E Test Group ' + Date.now(), 
        leaderUserId: leaderUserId,
      })
      .expect(201);

    expect(response.body).toHaveProperty('groupId');
    expect(response.body.status).toBe('Active'); 
    groupId = response.body.groupId; 
  });

  it('Phase 1.2: Add a member to the group as Coordinator', async () => {
    await request(app.getHttpServer())
      .post(`/groups/${groupId}/members`)
      .set('Authorization', coordinatorToken)
      .send({
        memberUserId: memberUserId,
      })
      .expect(201);
  });

  it('Phase 1.3: Deliver invites globally as Coordinator', async () => {
    const response = await request(app.getHttpServer())
      .post('/invites/deliver')
      .set('Authorization', coordinatorToken)
      .send({}); 
    if (response.status === 400) {
      console.error('The Reason of Error:', response.body);
    }

    expect(response.status).toBe(201);
  });

  it('Phase 2.1: List advisors as TeamLeader', async () => {
    const response = await request(app.getHttpServer())
      .get('/advisors')
      .set('Authorization', teamLeaderToken)
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('total');
    expect(response.body.total).toBeGreaterThanOrEqual(1);
  });

  it('Phase 2.2: Submit advisor request as TeamLeader', async () => {
    const response = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', teamLeaderToken)
      .send({
        requestedAdvisorId: professorId, 
      })
      .expect(201);

    expect(response.body).toHaveProperty('requestId');
    expect(response.body.status).toBe('PENDING');
    requestId = response.body.requestId; 
  });

  it('Phase 3: Approve request as Professor', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/requests/${requestId}/decision`)
      .set('Authorization', professorToken)
      .send({
        decision: 'APPROVE', 
      })
      .expect(200);

    expect(response.body.status).toBe('APPROVED');
  });

  it('Phase 4: Verify group assignment status updated to ASSIGNED', async () => {
    const response = await request(app.getHttpServer())
      .get(`/groups/${groupId}/status`)
      .set('Authorization', teamLeaderToken)
      .expect(200);

    expect(response.body.status).toBe('ASSIGNED'); 
    expect(response.body.advisorId).toBe(professorId);
    expect(response.body.canSubmitRequest).toBe(false);
  });
});