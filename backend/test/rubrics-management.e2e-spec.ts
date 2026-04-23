import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { RubricsModule } from '../src/rubrics/rubrics.module';
import { DeliverablesModule } from '../src/deliverables/deliverables.module';
import { AuthModule } from '../src/auth/auth.module';
import { ConfigModule } from '@nestjs/config';

/**
 * E2E tests for Rubrics Management (Process 1.2)
 *
 * Note: These tests are designed to work with a test MongoDB instance.
 * Ensure MONGODB_URI is set to a test database before running.
 */
describe('Rubrics Management E2E Tests', () => {
  let app: INestApplication;
  let jwtToken: string;
  let deliverableId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        MongooseModule.forRoot(
          process.env.MONGODB_URI || 'mongodb://localhost/test',
        ),
        AuthModule,
        DeliverablesModule,
        RubricsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // TODO: Replace with actual authentication flow
    // For now, this is a placeholder - in real scenario, you would:
    // 1. Create a test user
    // 2. Call /auth/login to get a JWT token
    jwtToken = process.env.TEST_JWT_TOKEN || 'test-token-placeholder';

    // TODO: Create a test deliverable
    // In real scenario:
    // const deliverable = await request(app.getHttpServer())
    //   .post('/api/v1/deliverables')
    //   .set('Authorization', `Bearer ${jwtToken}`)
    //   .send({ name: 'Test Deliverable' });
    // deliverableId = deliverable.body.deliverableId;
    deliverableId = 'deliverable-test-123';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /deliverables/{deliverableId}/rubrics - Create Rubric', () => {
    it('should create a rubric with valid criteria weights', async () => {
      const createRubricPayload = {
        name: 'Sprint 1 Evaluation Rubric',
        questions: [
          {
            criteriaName: 'Code Quality',
            criteriaWeight: 0.3,
          },
          {
            criteriaName: 'Documentation',
            criteriaWeight: 0.4,
          },
          {
            criteriaName: 'Testing',
            criteriaWeight: 0.3,
          },
        ],
      };

      // Note: This test is a template - actual execution requires:
      // 1. Valid JWT token with Coordinator role
      // 2. Test MongoDB instance
      // 3. Pre-existing deliverable in test DB

      const response = await request(app.getHttpServer())
        .post(`/api/v1/deliverables/${deliverableId}/rubrics`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(createRubricPayload)
        .expect(201);

      expect(response.body).toHaveProperty('rubricId');
      expect(response.body).toHaveProperty('deliverableId', deliverableId);
      expect(response.body).toHaveProperty('name', createRubricPayload.name);
      expect(response.body).toHaveProperty('isActive', true);
      expect(response.body).toHaveProperty('questions');
      expect(response.body.questions).toHaveLength(3);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should return 400 when criteria weights do not sum to 1.0', async () => {
      const invalidRubricPayload = {
        name: 'Invalid Rubric',
        questions: [
          {
            criteriaName: 'Code Quality',
            criteriaWeight: 0.5,
          },
          {
            criteriaName: 'Documentation',
            criteriaWeight: 0.3,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/deliverables/${deliverableId}/rubrics`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(invalidRubricPayload)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('sum to exactly 1.0');
    });

    it('should return 401 when JWT is missing', async () => {
      const createRubricPayload = {
        name: 'Test Rubric',
        questions: [{ criteriaName: 'Test', criteriaWeight: 1.0 }],
      };

      await request(app.getHttpServer())
        .post(`/api/v1/deliverables/${deliverableId}/rubrics`)
        .send(createRubricPayload)
        .expect(401);
    });

    it('should return 403 when user is not Coordinator', async () => {
      // Note: This test requires a valid JWT with non-Coordinator role
      const advisorToken =
        process.env.TEST_ADVISOR_JWT || 'advisor-token-placeholder';

      const createRubricPayload = {
        name: 'Test Rubric',
        questions: [{ criteriaName: 'Test', criteriaWeight: 1.0 }],
      };

      await request(app.getHttpServer())
        .post(`/api/v1/deliverables/${deliverableId}/rubrics`)
        .set('Authorization', `Bearer ${advisorToken}`)
        .send(createRubricPayload)
        .expect(403);
    });
  });

  describe('GET /deliverables/{deliverableId}/rubrics - List Rubrics', () => {
    it('should list all rubrics for a deliverable', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/deliverables/${deliverableId}/rubrics`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('rubricId');
        expect(response.body[0]).toHaveProperty('deliverableId', deliverableId);
        expect(response.body[0]).toHaveProperty('name');
        expect(response.body[0]).toHaveProperty('isActive');
        expect(response.body[0]).toHaveProperty('questions');
      }
    });

    it('should return only active rubric when activeOnly=true', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/deliverables/${deliverableId}/rubrics?activeOnly=true`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // All returned rubrics should be active
      response.body.forEach((rubric: any) => {
        expect(rubric.isActive).toBe(true);
      });
      // Should return at most 1 active rubric per deliverable
      expect(response.body.length).toBeLessThanOrEqual(1);
    });

    it('should return 404 when deliverable does not exist', async () => {
      const invalidDeliverableId = 'invalid-deliverable-id';

      await request(app.getHttpServer())
        .get(`/api/v1/deliverables/${invalidDeliverableId}/rubrics`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(404);
    });
  });

  describe('DELETE /deliverables/{deliverableId}/rubrics/{rubricId} - Delete Rubric', () => {
    let rubricIdToDelete: string;

    beforeEach(async () => {
      // Create a rubric to delete in tests
      const createResponse = await request(app.getHttpServer())
        .post(`/api/v1/deliverables/${deliverableId}/rubrics`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          name: 'Rubric to Delete',
          questions: [{ criteriaName: 'Test', criteriaWeight: 1.0 }],
        });

      if (createResponse.status === 201) {
        rubricIdToDelete = createResponse.body.rubricId;
      }
    });

    it('should delete an unused rubric', async () => {
      if (!rubricIdToDelete) {
        this.skip();
      }

      await request(app.getHttpServer())
        .delete(
          `/api/v1/deliverables/${deliverableId}/rubrics/${rubricIdToDelete}`,
        )
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(204);
    });

    it('should return 404 when rubric does not exist', async () => {
      const invalidRubricId = 'invalid-rubric-id';

      await request(app.getHttpServer())
        .delete(
          `/api/v1/deliverables/${deliverableId}/rubrics/${invalidRubricId}`,
        )
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(404);
    });

    it('should return 401 when JWT is missing', async () => {
      if (!rubricIdToDelete) {
        this.skip();
      }

      await request(app.getHttpServer())
        .delete(
          `/api/v1/deliverables/${deliverableId}/rubrics/${rubricIdToDelete}`,
        )
        .expect(401);
    });
  });

  describe('Complete Workflow - Create, List, Create New (Deactivate Old), Delete', () => {
    it('should complete full rubric lifecycle', async () => {
      // Step 1: Create first rubric
      const firstRubricResponse = await request(app.getHttpServer())
        .post(`/api/v1/deliverables/${deliverableId}/rubrics`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          name: 'First Rubric',
          questions: [
            { criteriaName: 'Quality', criteriaWeight: 0.5 },
            { criteriaName: 'Documentation', criteriaWeight: 0.5 },
          ],
        })
        .expect(201);

      const firstRubricId = firstRubricResponse.body?.rubricId;
      expect(firstRubricResponse.body?.isActive).toBe(true);

      // Step 2: List rubrics - should show first rubric as active
      let listResponse = await request(app.getHttpServer())
        .get(`/api/v1/deliverables/${deliverableId}/rubrics?activeOnly=true`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(listResponse.body).toHaveLength(1);
      expect(listResponse.body[0].rubricId).toBe(firstRubricId);

      // Step 3: Create second rubric - should deactivate first
      const secondRubricResponse = await request(app.getHttpServer())
        .post(`/api/v1/deliverables/${deliverableId}/rubrics`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          name: 'Second Rubric',
          questions: [{ criteriaName: 'Performance', criteriaWeight: 1.0 }],
        })
        .expect(201);

      const secondRubricId = secondRubricResponse.body?.rubricId;
      expect(secondRubricResponse.body?.isActive).toBe(true);

      // Step 4: Verify only second rubric is active now
      listResponse = await request(app.getHttpServer())
        .get(`/api/v1/deliverables/${deliverableId}/rubrics?activeOnly=true`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(listResponse.body).toHaveLength(1);
      expect(listResponse.body[0].rubricId).toBe(secondRubricId);

      // Step 5: List all rubrics - should show both
      listResponse = await request(app.getHttpServer())
        .get(`/api/v1/deliverables/${deliverableId}/rubrics`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(listResponse.body.length).toBeGreaterThanOrEqual(2);
      const activeCount = listResponse.body.filter(
        (r: any) => r.isActive,
      ).length;
      expect(activeCount).toBe(1);

      // Step 6: Delete first (inactive) rubric
      await request(app.getHttpServer())
        .delete(
          `/api/v1/deliverables/${deliverableId}/rubrics/${firstRubricId}`,
        )
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(204);

      // Step 7: Verify first rubric is gone
      listResponse = await request(app.getHttpServer())
        .get(`/api/v1/deliverables/${deliverableId}/rubrics`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      const deletedRubricExists = listResponse.body.some(
        (r: any) => r.rubricId === firstRubricId,
      );
      expect(deletedRubricExists).toBe(false);
    });
  });
});
