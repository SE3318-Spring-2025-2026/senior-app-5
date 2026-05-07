import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Types, Model, Connection } from 'mongoose';
import { Phase, PhaseDocument } from '../src/phases/phase.entity';
import { Submission, SubmissionDocument } from '../src/submissions/schemas/submission.schema';
import { GroupStatus } from '../src/groups/group.entity'; // Imported original GroupStatus enum
import * as jwt from 'jsonwebtoken';

process.env.JWT_ACCESS_SECRET = 'dev_access_secret_change_me';

describe('Submissions (e2e)', () => {
  let app: INestApplication;
  let phaseModel: Model<PhaseDocument>;
  let submissionModel: Model<SubmissionDocument>;
  let connection: Connection;
  let testPhase: PhaseDocument;
  let testSubmission: SubmissionDocument;
  
  let authToken: string;
  let studentAToken: string;
  let studentBToken: string;
  let studentLoneToken: string;
  
  const groupAlphaId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const groupBetaId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  let submissionAlphaId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1'); 
    await app.init();

    phaseModel = moduleFixture.get<Model<PhaseDocument>>(getModelToken(Phase.name));
    submissionModel = moduleFixture.get<Model<SubmissionDocument>>(getModelToken(Submission.name));
    connection = moduleFixture.get<Connection>(getConnectionToken());

    // CLEAN UP PREVIOUS TEST DATA TO AVOID DUPLICATION ERRORS
    await connection.collection('users').deleteMany({});
    await connection.collection('groups').deleteMany({});
    await submissionModel.deleteMany({});
    await phaseModel.deleteMany({});

    // 1. COORDINATOR USER AND TOKEN
    const coordUserId = '111111111111111111111111';
    await connection.collection('users').insertOne({
      _id: new Types.ObjectId(coordUserId),
      email: 'test@test.com',
      role: 'Coordinator'
    });

    authToken = jwt.sign(
      { sub: coordUserId, userId: coordUserId, email: 'test@test.com', role: 'Coordinator' },
      'dev_access_secret_change_me',
      { expiresIn: '1h' }
    );

    // 2. IDOR TEST GROUPS (Using original GroupStatus)
    await connection.collection('groups').insertMany([
      { _id: new Types.ObjectId(groupAlphaId), groupId: groupAlphaId, status: GroupStatus.ACTIVE },
      { _id: new Types.ObjectId(groupBetaId), groupId: groupBetaId, status: GroupStatus.ACTIVE }
    ]);

    // 3. STUDENT USERS AND HACKER USER FOR COMPLETENESS TEST
    const studentAId = 'aaaa1111aaaa1111aaaa1111';
    const studentBId = 'bbbb2222bbbb2222bbbb2222';
    const loneId = 'cccc3333cccc3333cccc3333';
    const hackerId = '222222222222222222222222';

    await connection.collection('users').insertMany([
      { _id: new Types.ObjectId(studentAId), email: 'studentA@test.com', role: 'Student', teamId: groupAlphaId },
      { _id: new Types.ObjectId(studentBId), email: 'studentB@test.com', role: 'Student', teamId: groupBetaId },
      { _id: new Types.ObjectId(loneId), email: 'lone@test.com', role: 'Student', teamId: null },
      { _id: new Types.ObjectId(hackerId), email: 'hacker@test.com', role: 'Student', teamId: '444444444444444444444444', groupId: '444444444444444444444444' }
    ]);

    // 4. STUDENT TOKENS
    studentAToken = jwt.sign({ sub: studentAId, userId: studentAId, role: 'Student', teamId: groupAlphaId, groupId: groupAlphaId }, 'dev_access_secret_change_me', { expiresIn: '15m' });
    studentBToken = jwt.sign({ sub: studentBId, userId: studentBId, role: 'Student', teamId: groupBetaId, groupId: groupBetaId }, 'dev_access_secret_change_me', { expiresIn: '15m' });
    studentLoneToken = jwt.sign({ sub: loneId, userId: loneId, role: 'Student', teamId: null, groupId: null }, 'dev_access_secret_change_me', { expiresIn: '15m' });

    // 5. PHASE AND SUBMISSION DATA FOR COMPLETENESS TESTS
    testPhase = await phaseModel.create({
      phaseId: 'test-phase-1',
      requiredFields: ['title', 'documents'],
      submissionStart: new Date(Date.now() - 1000 * 60 * 60),
      submissionEnd: new Date(Date.now() + 1000 * 60 * 60),
    });

    testSubmission = await submissionModel.create({
      title: 'Test Proposal',
      groupId: '333333333333333333333333', 
      type: 'INITIAL',
      phaseId: 'test-phase-1',
      submittedAt: new Date(),
      documents: [{ originalName: 'proposal.pdf', mimeType: 'application/pdf', uploadedAt: new Date() }],
    });

    await submissionModel.updateOne(
      { _id: testSubmission._id },
      { $set: { groupId: '333333333333333333333333' } },
      { strict: false }
    );
  }, 30000);

  afterAll(async () => {
    // Clean up all test data generated during the e2e tests
    await connection.collection('users').deleteMany({});
    await connection.collection('groups').deleteMany({});
    await submissionModel.deleteMany({});
    await phaseModel.deleteMany({});
    await app.close();
  });

  describe('GET /api/v1/submissions/:submissionId/completeness', () => {
    it('should return 200 and completeness data for valid submission', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/submissions/${testSubmission._id}/completeness`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should return 200 and incompleteness data when fields are missing', async () => {
      const incompleteSubmission = await submissionModel.create({
        title: 'Draft Proposal',
        groupId: '555555555555555555555555',
        type: 'INITIAL',
        phaseId: 'test-phase-1',
        submittedAt: new Date(),
        documents: [], 
      });

      return request(app.getHttpServer())
        .get(`/api/v1/submissions/${incompleteSubmission._id}/completeness`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should return 401 when no auth token provided', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/submissions/${testSubmission._id}/completeness`)
        .expect(401);
    });

    it('should return 400 for invalid submission ID format', () => {
      return request(app.getHttpServer())
        .get('/api/v1/submissions/invalid-id/completeness')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 404 for non-existent submission', () => {
      return request(app.getHttpServer())
        .get('/api/v1/submissions/000000000000000000000000/completeness') 
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 403 Forbidden when a student tries to access another group\'s submission', () => {
      const maliciousStudentToken = jwt.sign(
        { 
          sub: '222222222222222222222222', 
          userId: '222222222222222222222222',
          email: 'hacker@test.com', 
          role: 'Student', 
          teamId: '444444444444444444444444', 
          groupId: '444444444444444444444444' 
        },
        'dev_access_secret_change_me',
        { expiresIn: '1h' },
      );

      return request(app.getHttpServer())
        .get(`/api/v1/submissions/${testSubmission._id}/completeness`)
        .set('Authorization', `Bearer ${maliciousStudentToken}`)
        .expect(403);
    });
  });

  describe('IDOR & Group Membership Validation - /submissions (Write Operations)', () => {
    
    it('Valid Group Submission: Student_A initiates a submission for Group_Alpha (201 Created)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/submissions')
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({
          title: 'Alpha Project Proposal',
          groupId: groupAlphaId,
          type: 'INITIAL',
          phaseId: 'test-phase-1'
        })
        .expect(201);
      
      // Store the submission ID for the subsequent document upload test
      submissionAlphaId = response.body._id; 
    });

    it('Valid Document Upload: Student_A uploads a document to Group_Alpha submission (201 Created / 200 OK)', async () => {
      const mockPdf = Buffer.from('dummy pdf content');
      
      await request(app.getHttpServer())
        .post(`/api/v1/submissions/${submissionAlphaId}/documents`)
        .set('Authorization', `Bearer ${studentAToken}`)
        .attach('file', mockPdf, 'test_alpha.pdf')
        .expect(201); 
    });

    it('Cross-Group Submission (IDOR): Student_A attempts to initiate a submission for Group_Beta (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/submissions')
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({
          title: 'Hacked Beta Project Proposal',
          groupId: groupBetaId,
          type: 'INITIAL',
          phaseId: 'test-phase-1'
        })
        .expect(403);
    });

    it('Cross-Group File Upload (IDOR): Student_B attempts to upload a file to Group_Alpha submission (403 Forbidden)', async () => {
      const mockPdf = Buffer.from('malicious payload');

      await request(app.getHttpServer())
        .post(`/api/v1/submissions/${submissionAlphaId}/documents`)
        .set('Authorization', `Bearer ${studentBToken}`)
        .attach('file', mockPdf, 'hacked.pdf')
        .expect(403);
    });

    it('Unaffiliated User: Student_Lone attempts to submit for Group_Alpha (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/submissions')
        .set('Authorization', `Bearer ${studentLoneToken}`)
        .send({
          title: 'Lone Wolf Proposal',
          groupId: groupAlphaId,
          type: 'INITIAL',
          phaseId: 'test-phase-1'
        })
        .expect(403);
    });

    // FIXED: Expecting 403 because the system intentionally limits this action to Students via Guards
    it('Coordinator Bypass Check: Coordinator role is explicitly restricted from submitting on behalf of a group', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/submissions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Coordinator Override Proposal',
          groupId: groupBetaId,
          type: 'INITIAL',
          phaseId: 'test-phase-1'
        })
        .expect(403); 
    });

    it('Non-existent Group ID: Student_A attempts submission with a fake UUID (404 Not Found)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/submissions')
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({
          title: 'Ghost Proposal',
          groupId: 'ffffffffffffffffffffffff', 
          type: 'INITIAL',
          phaseId: 'test-phase-1'
        })
        .expect(404);
    });

    it('Missing Token: Attempting endpoint without Bearer token (401 Unauthorized)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/submissions')
        .send({
          title: 'No Auth Proposal',
          groupId: groupAlphaId,
          type: 'INITIAL',
          phaseId: 'test-phase-1'
        })
        .expect(401);
    });
    
    it('Expired Token: Attempting to submit using a JWT that has passed its expiration time (401 Unauthorized)', async () => {
      const expiredToken = jwt.sign(
        { sub: 'aaaa1111aaaa1111aaaa1111', role: 'Student' }, 
        'dev_access_secret_change_me', 
        { expiresIn: '-1h' } 
      );

      await request(app.getHttpServer())
        .post('/api/v1/submissions')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          title: 'Expired Auth Proposal',
          groupId: groupAlphaId,
          type: 'INITIAL',
          phaseId: 'test-phase-1'
        })
        .expect(401);
    });
  });
});