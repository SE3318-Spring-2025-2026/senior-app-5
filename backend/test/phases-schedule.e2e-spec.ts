import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { Reflector } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';

import { PhasesController } from '../src/phases/phases.controller';
import { PhasesService } from '../src/phases/phases.service';
import { Phase, PhaseSchema } from '../src/phases/phase.entity';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { Role } from '../src/auth/enums/role.enum';

describe('Phase Schedule API (e2e)', () => {
  let app: INestApplication<App>;
  let phaseModel: Model<Phase>;
  let testPhaseId: string = 'phase-1';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // Test için gerçek bir MongoDB veritabanına bağlanıyoruz
        MongooseModule.forRoot(
          process.env.MONGODB_URI || 'mongodb://localhost:27017/test-db',
        ),
        MongooseModule.forFeature([{ name: Phase.name, schema: PhaseSchema }]),
      ],
      controllers: [PhasesController],
      providers: [
        PhasesService, // Mock kaldırıldı, GERÇEK servis kullanılıyor
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

    // Veritabanı işlemleri için modeli alıyoruz
    phaseModel = moduleFixture.get<Model<Phase>>(getModelToken(Phase.name));
  });

  beforeEach(async () => {
    // Her test öncesi veritabanını temizle ve test için bir phase oluştur
    await phaseModel.deleteMany({});
    await phaseModel.create({
      phaseId: testPhaseId,
      name: 'Test Phase',
      requiredFields: [],
    });
  });

  afterAll(async () => {
    // Testler bitince veritabanını temizle ve bağlantıyı kapat
    await phaseModel.deleteMany({});
    await app.close();
  });

  it('No JWT -> 401', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/phases/${testPhaseId}/schedule`)
      .send({
        submissionStart: '2025-05-01T00:00:00.000Z',
        submissionEnd: '2025-05-08T00:00:00.000Z',
      })
      .expect(401);
  });

  it('STUDENT role -> 403', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/phases/${testPhaseId}/schedule`)
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
      .put(`/api/v1/phases/${testPhaseId}/schedule`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Coordinator)
      .send({ submissionStart: '2025-05-01T00:00:00.000Z' })
      .expect(400);
  });

  it('Invalid dates (End before Start) -> 400 (Real Service Logic)', async () => {
    // Servis katmanındaki iş mantığını (Business Logic) test ediyoruz
    const response = await request(app.getHttpServer())
      .put(`/api/v1/phases/${testPhaseId}/schedule`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Coordinator)
      .send({
        submissionStart: '2025-05-08T00:00:00.000Z', // Bitiş başlangıçtan önce
        submissionEnd: '2025-05-01T00:00:00.000Z',
      })
      .expect(400);

    expect(response.body.message).toContain('submissionEnd must be strictly after submissionStart');
  });

  it('Valid schedule -> 200 and saved schedule returned from DB', async () => {
    const response = await request(app.getHttpServer())
      .put(`/api/v1/phases/${testPhaseId}/schedule`)
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', Role.Coordinator)
      .send({
        submissionStart: '2025-05-01T00:00:00.000Z',
        submissionEnd: '2025-05-08T00:00:00.000Z',
      })
      .expect(200);

    // Dönen yanıtı kontrol et
    expect(response.body.phaseId).toEqual(testPhaseId);
    expect(response.body.submissionStart).toBe('2025-05-01T00:00:00.000Z');
    expect(response.body.submissionEnd).toBe('2025-05-08T00:00:00.000Z');

    // Veritabanına gerçekten kaydedildiğini teyit et
    const savedPhase = await phaseModel.findOne({ phaseId: testPhaseId });
    expect(savedPhase?.submissionStart?.toISOString()).toBe('2025-05-01T00:00:00.000Z');
    expect(savedPhase?.submissionEnd?.toISOString()).toBe('2025-05-08T00:00:00.000Z');
  });
});
