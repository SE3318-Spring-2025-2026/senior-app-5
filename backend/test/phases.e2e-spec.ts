import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import request from 'supertest';
import { PhasesController } from './../src/phases/phases.controller';
import { PhasesService } from './../src/phases/phases.service';
import {
  Phase,
  PhaseDocument,
  PhaseSchema,
} from './../src/phases/phase.entity';
import { JwtAuthGuard } from './../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from './../src/auth/guards/roles.guard';

describe('PhasesController (E2E)', () => {
  let app: INestApplication;
  let phaseModel: Model<PhaseDocument>;
  let mongoUri: string;

  const phaseWithoutScheduleId = 'phase-no-schedule';
  const phaseWithScheduleId = 'phase-with-schedule';

  beforeAll(async () => {
    mongoUri = process.env.MONGODB_URI || '';
    if (!mongoUri) {
      throw new Error(
        'MONGODB_URI must be set to run phase schedule e2e tests.',
      );
    }

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([{ name: Phase.name, schema: PhaseSchema }]),
      ],
      controllers: [PhasesController],
      providers: [PhasesService],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    phaseModel = module.get<Model<PhaseDocument>>(getModelToken(Phase.name));
  });

  beforeEach(async () => {
    await phaseModel.deleteMany({}).exec();

    await phaseModel.create([
      {
        phaseId: phaseWithoutScheduleId,
        name: 'No Schedule Phase',
        submissionStart: undefined,
        submissionEnd: undefined,
        requiredFields: [],
      },
      {
        phaseId: phaseWithScheduleId,
        name: 'Scheduled Phase',
        submissionStart: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        submissionEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        requiredFields: [],
      },
    ]);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Positive Tests - Valid Schedules', () => {
    it('should include phase names when listing phases for scheduling', async () => {
      const response = await request(app.getHttpServer())
        .get('/phases')
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            phaseId: phaseWithoutScheduleId,
            name: 'No Schedule Phase',
          }),
          expect.objectContaining({
            phaseId: phaseWithScheduleId,
            name: 'Scheduled Phase',
          }),
        ]),
      );
    });

    it('should create a valid schedule and persist it in the database', async () => {
      const now = new Date();
      const dto = {
        submissionStart: new Date(
          now.getTime() + 24 * 60 * 60 * 1000,
        ).toISOString(),
        submissionEnd: new Date(
          now.getTime() + 8 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };

      const response = await request(app.getHttpServer())
        .put(`/phases/${phaseWithoutScheduleId}/schedule`)
        .send(dto)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.submissionStart).toBe(dto.submissionStart);
      expect(response.body.submissionEnd).toBe(dto.submissionEnd);

      const saved = await phaseModel
        .findOne({ phaseId: phaseWithoutScheduleId })
        .lean();
      expect(saved).toBeDefined();
      expect(saved?.submissionStart?.toISOString()).toBe(dto.submissionStart);
      expect(saved?.submissionEnd?.toISOString()).toBe(dto.submissionEnd);
    });

    it('should update an existing schedule and overwrite the old values', async () => {
      const now = new Date();
      const dto = {
        submissionStart: new Date(
          now.getTime() + 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        submissionEnd: new Date(
          now.getTime() + 10 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };

      const response = await request(app.getHttpServer())
        .put(`/phases/${phaseWithScheduleId}/schedule`)
        .send(dto)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.submissionStart).toBe(dto.submissionStart);
      expect(response.body.submissionEnd).toBe(dto.submissionEnd);

      const updated = await phaseModel
        .findOne({ phaseId: phaseWithScheduleId })
        .lean();
      expect(updated?.submissionStart?.toISOString()).toBe(dto.submissionStart);
      expect(updated?.submissionEnd?.toISOString()).toBe(dto.submissionEnd);
    });
  });

  describe('POST /phases', () => {
    it('should create a phase with a generated phaseId and name', async () => {
      const response = await request(app.getHttpServer())
        .post('/phases')
        .send({ name: 'Final Report Submission' })
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          phaseId: expect.any(String),
          name: 'Final Report Submission',
          requiredFields: [],
        }),
      );
      expect(response.body.phaseId).toHaveLength(36);
      expect(response.body).not.toHaveProperty('submissionStart');
      expect(response.body).not.toHaveProperty('submissionEnd');

      const saved = await phaseModel
        .findOne({ phaseId: response.body.phaseId })
        .lean();
      expect(saved).toEqual(
        expect.objectContaining({
          name: 'Final Report Submission',
          requiredFields: [],
        }),
      );
    });

    it('should trim the phase name before saving', async () => {
      const response = await request(app.getHttpServer())
        .post('/phases')
        .send({ name: '  Sprint Demo  ' })
        .expect(201);

      expect(response.body.name).toBe('Sprint Demo');
    });

    it('should reject a missing phase name', async () => {
      await request(app.getHttpServer()).post('/phases').send({}).expect(400);
    });

    it('should reject a blank phase name', async () => {
      await request(app.getHttpServer())
        .post('/phases')
        .send({ name: '   ' })
        .expect(400);
    });

    it('should return 403 when a non-coordinator attempts to create a phase', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          MongooseModule.forRoot(mongoUri),
          MongooseModule.forFeature([
            { name: Phase.name, schema: PhaseSchema },
          ]),
        ],
        controllers: [PhasesController],
        providers: [PhasesService],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => false })
        .compile();

      const forbiddenApp = module.createNestApplication();
      forbiddenApp.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
      );
      await forbiddenApp.init();

      await request(forbiddenApp.getHttpServer())
        .post('/phases')
        .send({ name: 'Unauthorized Phase' })
        .expect(403);

      await forbiddenApp.close();
    });
  });

  describe('Negative Tests - Invalid Schedules', () => {
    it('should reject when submissionEnd is before submissionStart', async () => {
      const now = new Date();
      const dto = {
        submissionStart: new Date(
          now.getTime() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        submissionEnd: now.toISOString(),
      };

      await request(app.getHttpServer())
        .put(`/phases/${phaseWithoutScheduleId}/schedule`)
        .send(dto)
        .expect(400);
    });

    it('should reject when submissionStart and submissionEnd are identical', async () => {
      const now = new Date().toISOString();
      const dto = {
        submissionStart: now,
        submissionEnd: now,
      };

      const response = await request(app.getHttpServer())
        .put(`/phases/${phaseWithoutScheduleId}/schedule`)
        .send(dto)
        .expect(400);

      expect(response.body.message).toContain(
        'submissionEnd must be strictly after submissionStart',
      );
    });

    it('should reject when submissionStart is missing', async () => {
      const dto = {
        submissionEnd: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };

      await request(app.getHttpServer())
        .put(`/phases/${phaseWithoutScheduleId}/schedule`)
        .send(dto)
        .expect(400);
    });

    it('should reject when submissionEnd is missing', async () => {
      const dto = {
        submissionStart: new Date().toISOString(),
      };

      await request(app.getHttpServer())
        .put(`/phases/${phaseWithoutScheduleId}/schedule`)
        .send(dto)
        .expect(400);
    });

    it('should reject when submissionStart is not a valid date string', async () => {
      const dto = {
        submissionStart: 'next tuesday',
        submissionEnd: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };

      await request(app.getHttpServer())
        .put(`/phases/${phaseWithoutScheduleId}/schedule`)
        .send(dto)
        .expect(400);
    });
  });

  describe('Authorization & Edge Cases', () => {
    it('should return 403 when a STUDENT role attempts to update the schedule', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          MongooseModule.forRoot(mongoUri),
          MongooseModule.forFeature([
            { name: Phase.name, schema: PhaseSchema },
          ]),
        ],
        controllers: [PhasesController],
        providers: [PhasesService],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => false })
        .compile();

      const unauthorizedApp = module.createNestApplication();
      unauthorizedApp.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
      );
      await unauthorizedApp.init();

      const dto = {
        submissionStart: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString(),
        submissionEnd: new Date(
          Date.now() + 8 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };

      await request(unauthorizedApp.getHttpServer())
        .put(`/phases/${phaseWithoutScheduleId}/schedule`)
        .send(dto)
        .expect(403);

      await unauthorizedApp.close();
    });

    it('should return 404 when the phaseId does not exist', async () => {
      const dto = {
        submissionStart: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString(),
        submissionEnd: new Date(
          Date.now() + 8 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };

      await request(app.getHttpServer())
        .put('/phases/unknown-phase-id/schedule')
        .send(dto)
        .expect(404);
    });

    it('should return 401 when authentication fails', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          MongooseModule.forRoot(mongoUri),
          MongooseModule.forFeature([
            { name: Phase.name, schema: PhaseSchema },
          ]),
        ],
        controllers: [PhasesController],
        providers: [PhasesService],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({
          canActivate: () => {
            throw new UnauthorizedException();
          },
        })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      const unauthApp = module.createNestApplication();
      unauthApp.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
      );
      await unauthApp.init();

      const dto = {
        submissionStart: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString(),
        submissionEnd: new Date(
          Date.now() + 8 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };

      await request(unauthApp.getHttpServer())
        .put(`/phases/${phaseWithoutScheduleId}/schedule`)
        .send(dto)
        .expect(401);

      await unauthApp.close();
    });
  });
});
