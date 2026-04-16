import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PhasesController } from './../src/phases/phases.controller';
import { PhasesService } from './../src/phases/phases.service';
import { JwtAuthGuard } from './../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from './../src/auth/guards/roles.guard';
import { UnauthorizedException } from '@nestjs/common';

describe('PhasesController - PUT /phases/:phaseId/schedule (E2E)', () => {
  let app: INestApplication;
  let phasesService: jest.Mocked<PhasesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PhasesController],
      providers: [
        {
          provide: PhasesService,
          useValue: {
            updateSchedule: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    // ✅ Add global ValidationPipe to test DTO validation
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    phasesService = module.get(PhasesService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Positive Tests - Valid Schedules', () => {
    it('should create valid schedule (submissionStart today, submissionEnd 7 days later)', async () => {
      const now = new Date();
      const dto = {
        submissionStart: now.toISOString(),
        submissionEnd: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      phasesService.updateSchedule.mockResolvedValue({ id: '1', ...dto });

      const res = await request(app.getHttpServer())
        .put('/phases/1/schedule')
        .send(dto)
        .expect(200);

      // ✅ Assert response body is defined
      expect(res.body).toBeDefined();
      expect(phasesService.updateSchedule).toHaveBeenCalledWith('1', dto);
    });

    it('should update existing schedule with valid future dates', async () => {
      const now = new Date();
      const dto = {
        submissionStart: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        submissionEnd: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      };
      phasesService.updateSchedule.mockResolvedValue({ id: '1', ...dto });

      const res = await request(app.getHttpServer())
        .put('/phases/1/schedule')
        .send(dto)
        .expect(200);

      // ✅ Assert response body is defined
      expect(res.body).toBeDefined();
      expect(phasesService.updateSchedule).toHaveBeenCalledWith('1', dto);
    });
  });

  describe('Negative Tests - Invalid Schedules', () => {
    it('should reject if submissionEnd is before submissionStart', async () => {
      const now = new Date();
      const dto = {
        // ✅ Use .toISOString() for consistency
        submissionStart: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        submissionEnd: now.toISOString(),
      };
      phasesService.updateSchedule.mockResolvedValue({ id: '1', ...dto });

      // Validation should fail at the DTO/pipe level, not the service
      await request(app.getHttpServer())
        .put('/phases/1/schedule')
        .send(dto)
        .expect(400);
    });

    it('should reject if submissionStart and submissionEnd are identical', async () => {
      const now = new Date().toISOString();
      const dto = {
        // ✅ Use .toISOString() for consistency
        submissionStart: now,
        submissionEnd: now,
      };
      phasesService.updateSchedule.mockResolvedValue({});

      // Validation should fail at the DTO/pipe level, not the service
      await request(app.getHttpServer())
        .put('/phases/1/schedule')
        .send(dto)
        .expect(400);
    });

    it('should reject if submissionStart is missing', async () => {
      const dto = {
        // ✅ Missing submissionStart field
        submissionEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      // ValidationPipe should catch missing required field
      await request(app.getHttpServer())
        .put('/phases/1/schedule')
        .send(dto)
        .expect(400);
    });

    it('should reject if submissionEnd is missing', async () => {
      const dto = {
        // ✅ Missing submissionEnd field
        submissionStart: new Date().toISOString(),
      };

      // ValidationPipe should catch missing required field
      await request(app.getHttpServer())
        .put('/phases/1/schedule')
        .send(dto)
        .expect(400);
    });

    it('should reject if both submissionStart and submissionEnd are in the past', async () => {
      const now = new Date();
      const dto = {
        // ✅ Use .toISOString() for consistency
        submissionStart: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        submissionEnd: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      phasesService.updateSchedule.mockResolvedValue({});

      // Service validation should reject past dates
      await request(app.getHttpServer())
        .put('/phases/1/schedule')
        .send(dto)
        .expect(400);
    });
  });

  describe('Authorization Tests', () => {
    it('should return 403 for unauthorized role (STUDENT)', async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [PhasesController],
        providers: [
          {
            provide: PhasesService,
            useValue: {
              updateSchedule: jest.fn(),
            },
          },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => false })
        .compile();

      const testApp = module.createNestApplication();
      testApp.useGlobalPipes(new ValidationPipe());
      await testApp.init();

      const now = new Date();
      const dto = {
        // ✅ Use .toISOString() for consistency
        submissionStart: now.toISOString(),
        submissionEnd: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await request(testApp.getHttpServer())
        .put('/phases/1/schedule')
        .send(dto)
        .expect(403);

      await testApp.close();
    });

    it('should return 401 for unauthenticated access', async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [PhasesController],
        providers: [
          {
            provide: PhasesService,
            useValue: {
              updateSchedule: jest.fn(),
            },
          },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: jest.fn(() => { throw new UnauthorizedException(); }) })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      const testApp = module.createNestApplication();
      testApp.useGlobalPipes(new ValidationPipe());
      await testApp.init();

      const now = new Date();
      const dto = {
        // ✅ Use .toISOString() for consistency
        submissionStart: now.toISOString(),
        submissionEnd: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await request(testApp.getHttpServer())
        .put('/phases/1/schedule')
        .send(dto)
        .expect(401);

      await testApp.close();
    });
  });
});
