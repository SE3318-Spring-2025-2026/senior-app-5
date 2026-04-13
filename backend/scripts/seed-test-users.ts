import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { AppModule } from '../src/app.module';
import { User, UserDocument } from '../src/users/data/user.schema';
import { ROLES } from '../src/auth/constants/roles';

const logger = new Logger('SeedTestUsers');

const seedUsers = [
  {
    email: 'teamleader@example.com',
    password: 'SecurePass123',
    role: ROLES.TEAM_LEADER,
  },
  {
    email: 'coordinator@example.com',
    password: 'SecurePass123',
    role: ROLES.COORDINATOR,
  },
  {
    email: 'student@example.com',
    password: 'SecurePass123',
    role: ROLES.STUDENT,
  },
];

async function main(): Promise<void> {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not set. Make sure backend/.env is available.',
    );
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));

    for (const user of seedUsers) {
      const passwordHash = await bcrypt.hash(user.password, 12);

      await userModel.updateOne(
        { email: user.email },
        {
          $set: {
            email: user.email,
            passwordHash,
            role: user.role,
          },
        },
        { upsert: true },
      );

      logger.log(`Seeded ${user.email} as ${user.role}`);
    }

    logger.log('Test users seeded successfully.');
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
