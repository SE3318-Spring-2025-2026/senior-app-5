import {
  BadRequestException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { Reflector } from '@nestjs/core';
import { PhasesController } from '../src/phases/phases.controller';
import { PhasesService } from '../src/phases/phases.service';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { Role } from '../src/auth/enums/role.enum';

describe('Phase Schedule API (e2e)', () => {
  let app: INestApplication<App>;
  const mockPhasesService = {
    updateSchedule: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PhasesController],
      providers: [
        { provide: PhasesService, useValue: mockPhasesService },
        Reflector,
        RolesGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const authHeader = req.headers.authorization as string | undefined;
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing or invalid JWT');
          }

          const roleHeader = req.headers['x-test-role'] as string | undefined;
          req.user = {
            userId: 'test-user',
            role: roleHeader ?? Role.Coordinator,
          };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('No JWT -> 401', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/phases/phase-1/schedule')
      .send({
        submissionStart: '2025-05-01T00:00:00.000Z',
        submissionEnd: '2025-05-08T00:00:00.000Z',
      })
      .expect(401);
  });

  it('STUDENT role -> 403', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/phases/phase-1/schedule')
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Student)
      .send({
        submissionStart: '2025-05-01T00:00:00.000Z',
        submissionEnd: '2025-05-08T00:00:00.000Z',
      })
      .expect(403);
  });

  it('Missing date fields -> 400', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/phases/phase-1/schedule')
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Coordinator)
      .send({ submissionStart: '2025-05-01T00:00:00.000Z' })
      .expect(400);
  });

  it('End date before start date -> 400', async () => {
    mockPhasesService.updateSchedule.mockRejectedValue(
      new BadRequestException('submissionEnd must be strictly after submissionStart'),
    );

    await request(app.getHttpServer())
      .put('/api/v1/phases/phase-1/schedule')
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Coordinator)
      .send({
        submissionStart: '2025-05-08T00:00:00.000Z',
        submissionEnd: '2025-05-01T00:00:00.000Z',
      })
      .expect(400);
  });

  it('Identical timestamps -> 400', async () => {
    mockPhasesService.updateSchedule.mockRejectedValue(
      new BadRequestException('submissionEnd must be strictly after submissionStart'),
    );

    await request(app.getHttpServer())
      .put('/api/v1/phases/phase-1/schedule')
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Coordinator)
      .send({
        submissionStart: '2025-05-01T00:00:00.000Z',
        submissionEnd: '2025-05-01T00:00:00.000Z',
      })
      .expect(400);
  });

  it('Valid schedule -> 200 and saved schedule returned', async () => {
    const savedPhase = {
      phaseId: 'phase-1',
      submissionStart: new Date('2025-05-01T00:00:00.000Z'),
      submissionEnd: new Date('2025-05-08T00:00:00.000Z'),
    };
    mockPhasesService.updateSchedule.mockResolvedValue(savedPhase);

    const response = await request(app.getHttpServer())
      .put('/api/v1/phases/phase-1/schedule')
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Coordinator)
      .send({
        submissionStart: '2025-05-01T00:00:00.000Z',
        submissionEnd: '2025-05-08T00:00:00.000Z',
      })
      .expect(200);

    expect(response.body).toEqual({
      phaseId: 'phase-1',
      submissionStart: '2025-05-01T00:00:00.000Z',
      submissionEnd: '2025-05-08T00:00:00.000Z',
    });
    expect(mockPhasesService.updateSchedule).toHaveBeenCalledWith('phase-1', {
      submissionStart: '2025-05-01T00:00:00.000Z',
      submissionEnd: '2025-05-08T00:00:00.000Z',
    });
  });
});
