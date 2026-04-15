import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { AppModule } from '../src/app.module';
import { Role } from '../src/auth/enums/role.enum';
import { Group, GroupDocument, GroupStatus } from '../src/groups/group.entity';
import { User, UserDocument } from '../src/users/data/user.schema';

const logger = new Logger('SeedTestUsers');

const seedUsers = [
  {
    email: 'teamleader@example.com',
    password: 'SecurePass123',
    role: Role.TeamLeader,
  },
  {
    email: 'coordinator@example.com',
    password: 'SecurePass123',
    role: Role.Coordinator,
  },
  {
    email: 'student@example.com',
    password: 'SecurePass123',
    role: Role.Student,
  },
  {
    email: 'advisor@example.com',
    password: 'SecurePass123',
    role: Role.Professor,
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
    const groupModel = app.get<Model<GroupDocument>>(getModelToken(Group.name));

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

    const teamLeader = await userModel
      .findOne({ email: 'teamleader@example.com' })
      .exec();

    if (teamLeader?._id) {
      await groupModel.updateOne(
        { leaderUserId: teamLeader._id.toString() },
        {
          $set: {
            groupName: 'Seeded Team Leader Group',
            leaderUserId: teamLeader._id.toString(),
            status: GroupStatus.ACTIVE,
          },
        },
        { upsert: true },
      );

      logger.log('Seeded active group for teamleader@example.com');
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
