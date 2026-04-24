import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Phase, PhaseDocument } from '../src/phases/phase.entity';
import { Submission, SubmissionDocument } from '../src/submissions/schemas/submission.schema';
import * as jwt from 'jsonwebtoken';

describe('Submissions (e2e)', () => {
  let app: INestApplication<App>;
  let phaseModel: Model<PhaseDocument>;
  let submissionModel: Model<SubmissionDocument>;
  let testPhase: PhaseDocument;
  let testSubmission: SubmissionDocument;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    phaseModel = moduleFixture.get<Model<PhaseDocument>>(getModelToken(Phase.name));
    submissionModel = moduleFixture.get<Model<SubmissionDocument>>(getModelToken(Submission.name));

    authToken = jwt.sign(
      { sub: 'test-user-id', email: 'test@test.com', role: 'Coordinator' },
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
      groupId: 'test-group-1',
      type: 'INITIAL',
      phaseId: 'test-phase-1',
      submittedAt: new Date(),
      documents: [
        {
          originalName: 'proposal.pdf',
          mimeType: 'application/pdf',
          uploadedAt: new Date(),
        },
      ],
    });
  }, 30000);

  afterAll(async () => {
    if (testSubmission) {
      await submissionModel.deleteOne({ _id: testSubmission._id });
    }
    if (testPhase) {
      await phaseModel.deleteOne({ _id: testPhase._id });
    }
    await app.close();
  });

  describe('GET /api/v1/submissions/:submissionId/completeness', () => {
    it('should return 200 and completeness data for valid submission', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/submissions/${testSubmission._id}/completeness`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            submissionId: testSubmission._id.toString(),
            isComplete: true,
            missingFields: [],
            requiredFields: ['title', 'documents'],
            phaseId: 'test-phase-1',
          });
        });
    });

    it('should return 200 and incompleteness data when fields are missing', async () => {
      const incompleteSubmission = await submissionModel.create({
        title: '',
        groupId: 'test-group-2',
        type: 'INITIAL',
        phaseId: 'test-phase-1',
        submittedAt: new Date(),
        documents: [],
      });

      return request(app.getHttpServer())
        .get(`/api/v1/submissions/${incompleteSubmission._id}/completeness`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            submissionId: incompleteSubmission._id.toString(),
            isComplete: false,
            missingFields: ['title', 'documents'],
            requiredFields: ['title', 'documents'],
            phaseId: 'test-phase-1',
          });
        })
        .then(() => {
          return submissionModel.deleteOne({ _id: incompleteSubmission._id });
        });
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
        .get('/api/v1/submissions/64f1a2b3c4d5e6f7a8b9c0d1/completeness')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
