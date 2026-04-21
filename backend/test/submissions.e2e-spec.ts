import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Phase, PhaseDocument } from '../src/phases/phase.entity';
import { Submission, SubmissionDocument } from '../src/submissions/schemas/submission.schema';

describe('Submissions (e2e)', () => {
  let app: INestApplication<App>;
  let phaseModel: Model<PhaseDocument>;
  let submissionModel: Model<SubmissionDocument>;
  let testPhase: PhaseDocument;
  let testSubmission: SubmissionDocument;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    phaseModel = moduleFixture.get<Model<PhaseDocument>>(getModelToken(Phase.name));
    submissionModel = moduleFixture.get<Model<SubmissionDocument>>(getModelToken(Submission.name));

    // Seed test data
    testPhase = await phaseModel.create({
      phaseId: 'test-phase-1',
      requiredFields: ['title', 'documents'],
      submissionStart: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      submissionEnd: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
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
  }, 30000); // Increase timeout to 30 seconds

  afterAll(async () => {
    // Clean up test data
    if (testSubmission) {
      await submissionModel.deleteOne({ _id: testSubmission._id });
    }
    if (testPhase) {
      await phaseModel.deleteOne({ _id: testPhase._id });
    }
    await app.close();
  });

  describe('GET /submissions/:submissionId/completeness', () => {
    it('should return 200 and completeness data for valid submission', () => {
      return request(app.getHttpServer())
        .get(`/submissions/${testSubmission._id}/completeness`)
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
      // Create incomplete submission
      const incompleteSubmission = await submissionModel.create({
        title: '', // missing title
        groupId: 'test-group-2',
        type: 'INITIAL',
        phaseId: 'test-phase-1',
        submittedAt: new Date(),
        documents: [], // missing documents
      });

      return request(app.getHttpServer())
        .get(`/submissions/${incompleteSubmission._id}/completeness`)
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
          // Clean up
          return submissionModel.deleteOne({ _id: incompleteSubmission._id });
        });
    });

    it('should return 404 for non-existent submission', () => {
      return request(app.getHttpServer())
        .get('/submissions/nonexistent-id/completeness')
        .expect(404);
    });
  });
});