import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Types, Model, Connection } from 'mongoose';
import { Phase, PhaseDocument } from '../src/phases/phase.entity';
import { Submission, SubmissionDocument } from '../src/submissions/schemas/submission.schema';
import * as jwt from 'jsonwebtoken';

describe('Submissions (e2e)', () => {
  let app: INestApplication;
  let phaseModel: Model<PhaseDocument>;
  let submissionModel: Model<SubmissionDocument>;
  let connection: Connection;
  let testPhase: PhaseDocument;
  let testSubmission: SubmissionDocument;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1'); 
    await app.init();

    phaseModel = moduleFixture.get<Model<PhaseDocument>>(getModelToken(Phase.name));
    submissionModel = moduleFixture.get<Model<SubmissionDocument>>(getModelToken(Submission.name));
    
    // Veritabanı bağlantısını alıyoruz
    connection = moduleFixture.get<Connection>(getConnectionToken());

    // 🟢 NİHAİ ÇÖZÜM: Hacker'ı fiziksel olarak veritabanına kaydediyoruz!
    // Böylece JwtStrategy onu bulacak ve rolünü "Student" olarak onaylayacak.
    await connection.collection('users').insertOne({
      _id: new Types.ObjectId('222222222222222222222222'),
      email: 'hacker@test.com',
      role: 'Student',
      teamId: '444444444444444444444444',
      groupId: '444444444444444444444444'
    });

    authToken = jwt.sign(
      { sub: '111111111111111111111111', email: 'test@test.com', role: 'Coordinator' },
      'dev_access_secret_change_me',
      { expiresIn: '1h' },
    );

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

    // Mongoose kurallarını ezip orijinal başvuruyu kaydediyoruz
    await submissionModel.updateOne(
      { _id: testSubmission._id },
      { $set: { groupId: '333333333333333333333333' } },
      { strict: false }
    );

  }, 30000);

  afterAll(async () => {
    if (testSubmission) await submissionModel.deleteOne({ _id: testSubmission._id });
    if (testPhase) await phaseModel.deleteOne({ _id: testPhase._id });
    // Test bitince hacker'ı veritabanından siliyoruz
    await connection.collection('users').deleteOne({ _id: new Types.ObjectId('222222222222222222222222') });
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
        .expect(200)
        .then(() => submissionModel.deleteOne({ _id: incompleteSubmission._id }));
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
});