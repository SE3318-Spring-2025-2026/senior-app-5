import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../src/users/data/user.schema';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto'; 

describe('Password Reset (e2e) - Smoke Test', () => {
  let app: INestApplication<App>;
  let userModel: Model<UserDocument>;
  let testUser: UserDocument;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));
    const passwordHash = await bcrypt.hash('OldPassword123', 10);
    testUser = await userModel.create({
      email: 'reset-test@example.com',
      passwordHash,
    });
  }, 30000);

  afterAll(async () => {
    if (testUser) {
      await userModel.deleteOne({ _id: testUser._id });
    }
    await app.close();
  });

  describe('POST /api/v1/auth/password-reset/request', () => {
    it('should return 202 for a registered email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/request')
        .send({ email: 'reset-test@example.com' })
        .expect(202)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(typeof res.body.message).toBe('string');
        });
    });

    it('should return 202 for an unregistered email (security: no user enumeration)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/request')
        .send({ email: 'nonexistent@example.com' })
        .expect(202);
    });

    it('should return 400 for invalid email format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/request')
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it('should return 400 for missing email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/request')
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/password-reset/confirm', () => {
    // 2. EKLENEN: Tam teşekküllü, gerçek raw token ile çalışan E2E Testi
    it('should return 200 and update password with a valid token (happy path)', async () => {
      // Geçerli bir token oluştur ve veritabanına kaydet
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex'); 
      const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

      await userModel.findByIdAndUpdate(testUser._id, {
        passwordResetTokenHash: hashedToken,
        passwordResetTokenExpiresAt: tokenExpiry,
      });
      await request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/confirm')
        .send({ token: rawToken, newPassword: 'NewSecurePassword123!' })
        .expect(200);
      const updatedUser = await userModel.findById(testUser._id).exec();
      
      expect(updatedUser?.passwordResetTokenHash).toBeUndefined();
      expect(updatedUser?.passwordResetTokenExpiresAt).toBeUndefined();
      
      const isPasswordUpdated = await bcrypt.compare('NewSecurePassword123!', updatedUser!.passwordHash);
      expect(isPasswordUpdated).toBe(true);
    });

    it('should return 400 for an invalid (non-existent) token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/confirm')
        .send({ token: 'completely-invalid-token', newPassword: 'NewPassword123' })
        .expect(400);
    });

    it('should return 400 for missing token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/confirm')
        .send({ newPassword: 'NewPassword123' })
        .expect(400);
    });

    it('should return 400 for missing newPassword', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/confirm')
        .send({ token: 'some-token' })
        .expect(400);
    });

    it('should return 400 for password shorter than 8 characters', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/confirm')
        .send({ token: 'some-token', newPassword: '123' })
        .expect(400);
    });
  });
});
