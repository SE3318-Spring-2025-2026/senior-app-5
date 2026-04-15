import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PhasesController } from './phases.controller';
import { PhasesService } from './phases.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('PhasesController', () => {
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
    await app.init();
    phasesService = module.get(PhasesService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('PUT /phases/:phaseId/schedule', () => {
    it('should create valid schedule (positive: submissionStart today, submissionEnd 7 days later)', () => {
      const dto = {
        submissionStart: new Date().toISOString(),
        submissionEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      phasesService.updateSchedule.mockResolvedValue({});

      return request(app.getHttpServer())
        .put('/phases/1/schedule')
        .send(dto)
        .expect(200)
        .then(() => {
          expect(phasesService.updateSchedule).toHaveBeenCalledWith('1', dto);
        });
    });

    it('should update existing schedule with valid future dates (positive)', () => {
      const dto = {
        submissionStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        submissionEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      };
      phasesService.updateSchedule.mockResolvedValue({});

      return request(app.getHttpServer())
        .put('/phases/1/schedule')
        .send(dto)
        .expect(200)
        .then(() => {
          expect(phasesService.updateSchedule).toHaveBeenCalledWith('1', dto);
        });
    });

    it('should reject if submissionEnd is before submissionStart (negative)', () => {
      const dto = {
        submissionStart: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        submissionEnd: new Date(),
      };
      phasesService.updateSchedule.mockRejectedValue(new BadRequestException('Invalid date range'));

      return request(app.getHttpServer())
        .put('/phases/1/schedule')
        .send(dto)
        .expect(400);
    });

    it('should reject if submissionStart and submissionEnd are identical (negative)', () => {
      const now = new Date();
      const dto = {
        submissionStart: now,
        submissionEnd: now,
      };
      phasesService.updateSchedule.mockRejectedValue(new BadRequestException('Invalid date range'));

      return request(app.getHttpServer())
        .put('/phases/1/schedule')
        .send(dto)
        .expect(400);
    });

    it('should reject if submissionStart is missing (negative)', () => {
      const dto = {
        submissionEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
      phasesService.updateSchedule.mockRejectedValue(new BadRequestException('Validation failed'));

      return request(app.getHttpServer())
        .put('/phases/1/schedule')
        .send(dto)
        .expect(400);
    });

    it('should reject if submissionEnd is missing (negative)', () => {
      const dto = {
        submissionStart: new Date(),
      };
      phasesService.updateSchedule.mockRejectedValue(new BadRequestException('Validation failed'));

      return request(app.getHttpServer())
        .put('/phases/1/schedule')
        .send(dto)
        .expect(400);
    });

    it('should reject if submissionEnd is in the past (negative, assuming business rule)', () => {
      const dto = {
        submissionStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
        submissionEnd: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      };
      phasesService.updateSchedule.mockRejectedValue(new BadRequestException('Invalid date range'));

      return request(app.getHttpServer())
        .put('/phases/1/schedule')
        .send(dto)
        .expect(400);
    });
  });

  describe('Authorization', () => {
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
      await testApp.init();

      const dto = {
        submissionStart: new Date(),
        submissionEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
      await testApp.init();

      const dto = {
        submissionStart: new Date().toISOString(),
        submissionEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await request(testApp.getHttpServer())
        .put('/phases/1/schedule')
        .send(dto)
        .expect(401);

      await testApp.close();
    });
  });
});