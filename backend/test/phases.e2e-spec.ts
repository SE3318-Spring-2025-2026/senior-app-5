import { INestApplication, ValidationPipe, UnauthorizedException } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import request from 'supertest';
import { PhasesController } from './../src/phases/phases.controller';
import { PhasesService } from './../src/phases/phases.service';
import { Phase, PhaseDocument, PhaseSchema } from './../src/phases/phase.entity';
import { JwtAuthGuard } from './../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from './../src/auth/guards/roles.guard';

describe('PhasesController - PUT /phases/:phaseId/schedule (E2E)', () => {
  let app: INestApplication;
  let phaseModel: Model<PhaseDocument>;
  let mongoUri: string;

  const phaseWithoutScheduleId = 'phase-no-schedule';
  const phaseWithScheduleId = 'phase-with-schedule';

  beforeAll(async () => {
    mongoUri = process.env.MONGODB_URI || '';
    if (!mongoUri) {
      throw new Error('MONGODB_URI must be set to run phase schedule e2e tests.');
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    phaseModel = module.get<Model<PhaseDocument>>(getModelToken(Phase.name));
  });

  beforeEach(async () => {
    await phaseModel.deleteMany({}).exec();

    await phaseModel.create([
      {
        phaseId: phaseWithoutScheduleId,
        submissionStart: undefined,
        submissionEnd: undefined,
        requiredFields: [],
      },
      {
        phaseId: phaseWithScheduleId,
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
    it('should create a valid schedule and persist it in the database', async () => {
      const now = new Date();
      const dto = {
        submissionStart: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        submissionEnd: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app.getHttpServer())
        .put(`/phases/${phaseWithoutScheduleId}/schedule`)
        .send(dto)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.submissionStart).toBe(dto.submissionStart);
      expect(response.body.submissionEnd).toBe(dto.submissionEnd);

      const saved = await phaseModel.findOne({ phaseId: phaseWithoutScheduleId }).lean();
      expect(saved).toBeDefined();
      expect(saved?.submissionStart?.toISOString()).toBe(dto.submissionStart);
      expect(saved?.submissionEnd?.toISOString()).toBe(dto.submissionEnd);
    });

    it('should update an existing schedule and overwrite the old values', async () => {
      const now = new Date();
      const dto = {
        submissionStart: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        submissionEnd: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app.getHttpServer())
        .put(`/phases/${phaseWithScheduleId}/schedule`)
        .send(dto)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.submissionStart).toBe(dto.submissionStart);
      expect(response.body.submissionEnd).toBe(dto.submissionEnd);

      const updated = await phaseModel.findOne({ phaseId: phaseWithScheduleId }).lean();
      expect(updated?.submissionStart?.toISOString()).toBe(dto.submissionStart);
      expect(updated?.submissionEnd?.toISOString()).toBe(dto.submissionEnd);
    });
  });

  describe('Negative Tests - Invalid Schedules', () => {
    it('should reject when submissionEnd is before submissionStart', async () => {
      const now = new Date();
      const dto = {
        submissionStart: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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

      expect(response.body.message).toContain('submissionEnd must be strictly after submissionStart');
    });

    it('should reject when submissionStart is missing', async () => {
      const dto = {
        submissionEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
        submissionEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
          MongooseModule.forFeature([{ name: Phase.name, schema: PhaseSchema }]),
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
      unauthorizedApp.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      await unauthorizedApp.init();

      const dto = {
        submissionStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        submissionEnd: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await request(unauthorizedApp.getHttpServer())
        .put(`/phases/${phaseWithoutScheduleId}/schedule`)
        .send(dto)
        .expect(403);

      await unauthorizedApp.close();
    });

    it('should return 404 when the phaseId does not exist', async () => {
      const dto = {
        submissionStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        submissionEnd: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
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
          MongooseModule.forFeature([{ name: Phase.name, schema: PhaseSchema }]),
        ],
        controllers: [PhasesController],
        providers: [PhasesService],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => { throw new UnauthorizedException(); } })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      const unauthApp = module.createNestApplication();
      unauthApp.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      await unauthApp.init();

      const dto = {
        submissionStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        submissionEnd: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await request(unauthApp.getHttpServer())
        .put(`/phases/${phaseWithoutScheduleId}/schedule`)
        .send(dto)
        .expect(401);

      await unauthApp.close();
    });
  });
});
