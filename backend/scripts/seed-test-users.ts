import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { AppModule } from '../src/app.module';
import { Role } from '../src/auth/enums/role.enum';
import {
  Group,
  GroupAssignmentStatus,
  GroupDocument,
  GroupStatus,
} from '../src/groups/group.entity';
import {
  GradeHistoryEntry,
  GradeHistoryEntryDocument,
  GroupFinalGrade,
  GroupFinalGradeDocument,
  StudentFinalGrade,
  StudentFinalGradeDocument,
} from '../src/grades/schemas/grade-records.schema';
import { User, UserDocument } from '../src/users/data/user.schema';

const logger = new Logger('SeedTestUsers');

const seedGroupId = '11111111-1111-1111-1111-111111111111';
const firstHistoryChangeId = '22222222-2222-2222-2222-222222222222';
const secondHistoryChangeId = '33333333-3333-3333-3333-333333333333';

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
    email: 'professor@example.com',
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
    const groupFinalGradeModel = app.get<Model<GroupFinalGradeDocument>>(
      getModelToken(GroupFinalGrade.name),
    );
    const studentFinalGradeModel = app.get<Model<StudentFinalGradeDocument>>(
      getModelToken(StudentFinalGrade.name),
    );
    const gradeHistoryEntryModel = app.get<Model<GradeHistoryEntryDocument>>(
      getModelToken(GradeHistoryEntry.name),
    );

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

    const [teamLeader, coordinator, student] = await Promise.all([
      userModel.findOne({ email: 'teamleader@example.com' }).exec(),
      userModel.findOne({ email: 'coordinator@example.com' }).exec(),
      userModel.findOne({ email: 'student@example.com' }).exec(),
    ]);

    if (teamLeader?._id) {
      await groupModel.updateOne(
        { groupId: seedGroupId },
        {
          $set: {
            groupId: seedGroupId,
            groupName: 'Seeded Grade Read Group',
            leaderUserId: teamLeader._id.toString(),
            status: GroupStatus.ACTIVE,
            assignmentStatus: GroupAssignmentStatus.ASSIGNED,
            assignedAdvisorId: coordinator?._id?.toString() ?? null,
          },
        },
        { upsert: true },
      );

      logger.log(
        `Seeded active group for teamleader@example.com (${seedGroupId})`,
      );
    }

    if (student?._id) {
      await userModel.updateOne(
        { email: 'student@example.com' },
        {
          $set: {
            teamId: seedGroupId,
          },
        },
      );

      await studentFinalGradeModel.deleteMany({ groupId: seedGroupId });
      await studentFinalGradeModel.insertMany([
        {
          studentId: student._id.toString(),
          groupId: seedGroupId,
          individualAllowanceRatio: 0.95,
          finalGrade: 86.64,
          calculatedAt: new Date('2026-04-29T10:00:00.000Z'),
        },
      ]);
      logger.log(`Seeded student final grade for ${student.email}`);
    }

    await groupFinalGradeModel.updateOne(
      { groupId: seedGroupId },
      {
        $set: {
          groupId: seedGroupId,
          teamGrade: 91.2,
          calculatedAt: new Date('2026-04-29T10:00:00.000Z'),
        },
      },
      { upsert: true },
    );

    await gradeHistoryEntryModel.deleteMany({ groupId: seedGroupId });
    await gradeHistoryEntryModel.insertMany([
      {
        gradeChangeId: firstHistoryChangeId,
        groupId: seedGroupId,
        teamGrade: 89.0,
        gradeComponents: {
          committeeGrade: 88,
          storyPoints: 90,
          individualAllowanceRatio: 0.93,
        },
        triggeredBy: coordinator?._id?.toString() ?? 'seed-script',
        changedAt: new Date('2026-04-28T10:00:00.000Z'),
      },
      {
        gradeChangeId: secondHistoryChangeId,
        groupId: seedGroupId,
        teamGrade: 91.2,
        gradeComponents: {
          committeeGrade: 90,
          storyPoints: 92,
          individualAllowanceRatio: 0.95,
        },
        triggeredBy: coordinator?._id?.toString() ?? 'seed-script',
        changedAt: new Date('2026-04-29T10:00:00.000Z'),
      },
    ]);

    logger.log(`Seeded grade history for group ${seedGroupId}`);
    logger.log(
      `Use validGroupId=${seedGroupId} for the Issue 138 Postman collection.`,
    );

    logger.log('Test users seeded successfully.');
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
