/**
 * Full seed script — creates a complete test environment covering every major feature:
 *
 *   Users        : 1 Admin, 2 Coordinators, 3 Professors (Advisors), 6 Students, 2 Team Leaders
 *   Groups       : 2 active groups, each with a team leader + 2 students
 *   Advisor link : Group-1 advisor assigned + approved AdvisorRequest
 *   Committee    : 1 committee with jury + advisor members, assigned to both groups
 *   Team         : 1 team linked to Group-1 (JIRA / GitHub keys set)
 *   Phase        : 1 open submission phase
 *   Submission   : 1 SOW + 1 RevisedProposal for Group-1
 *   SprintConfig : 1 active SCRUM sprint for Group-1
 *   StoryPoints  : 2 JIRA_GITHUB records (one per student in Group-1)
 *
 * Run:
 *   npm run seed:full
 *
 * All passwords:  SecurePass123!
 * All UUIDs are stable — re-running the script is idempotent.
 */

import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { AppModule } from '../src/app.module';

import { Role } from '../src/auth/enums/role.enum';
import { User, UserDocument } from '../src/users/data/user.schema';
import {
  Group,
  GroupDocument,
  GroupAssignmentStatus,
  GroupStatus,
} from '../src/groups/group.entity';
import {
  AdvisorRequest,
  AdvisorRequestDocument,
  AdvisorRequestStatus,
} from '../src/advisors/schemas/advisor-request.schema';
import {
  Committee,
  CommitteeDocument,
} from '../src/committees/schemas/committee.schema';
import { Team, TeamDocument } from '../src/teams/schemas/team.schema';
import { Phase, PhaseDocument } from '../src/phases/phase.entity';
import {
  Submission,
  SubmissionDocument,
} from '../src/submissions/schemas/submission.schema';
import {
  SprintConfig,
  SprintConfigDocument,
} from '../src/story-points/schemas/sprint-config.schema';
import {
  StoryPointRecord,
  StoryPointRecordDocument,
  StoryPointSource,
} from '../src/story-points/schemas/story-point-record.schema';

// Use plain console so output is visible regardless of NestJS log level config
const log = {
  log:   (msg: string) => console.log(`[SeedFull] ${msg}`),
  error: (msg: string) => console.error(`[SeedFull] ERROR ${msg}`),
};

// ─── Stable UUIDs ────────────────────────────────────────────────────────────
const IDS = {
  // users
  admin:        'a0000000-0000-0000-0000-000000000001',
  coord1:       'a0000000-0000-0000-0000-000000000002',
  coord2:       'a0000000-0000-0000-0000-000000000003',
  prof1:        'a0000000-0000-0000-0000-000000000004',
  prof2:        'a0000000-0000-0000-0000-000000000005',
  prof3:        'a0000000-0000-0000-0000-000000000006',
  tl1:          'a0000000-0000-0000-0000-000000000007',
  tl2:          'a0000000-0000-0000-0000-000000000008',
  student1:     'a0000000-0000-0000-0000-000000000009',
  student2:     'a0000000-0000-0000-0000-000000000010',
  student3:     'a0000000-0000-0000-0000-000000000011',
  student4:     'a0000000-0000-0000-0000-000000000012',
  student5:     'a0000000-0000-0000-0000-000000000013',
  student6:     'a0000000-0000-0000-0000-000000000014',
  // groups
  group1:       'b0000000-0000-0000-0000-000000000001',
  group2:       'b0000000-0000-0000-0000-000000000002',
  // committee
  committee1:   'c0000000-0000-0000-0000-000000000001',
  // phase
  phase1:       'd0000000-0000-0000-0000-000000000001',
  // sprint
  sprint1:      'e0000000-0000-0000-0000-000000000001',
};

const PASSWORD = 'SecurePass123!';

// ─── User definitions ────────────────────────────────────────────────────────
const USERS = [
  { id: IDS.admin,    email: 'admin@example.com',      role: Role.Admin,       name: 'Admin User' },
  { id: IDS.coord1,   email: 'coordinator1@example.com', role: Role.Coordinator, name: 'Coordinator One' },
  { id: IDS.coord2,   email: 'coordinator2@example.com', role: Role.Coordinator, name: 'Coordinator Two' },
  { id: IDS.prof1,    email: 'professor1@example.com',  role: Role.Professor,   name: 'Professor One' },
  { id: IDS.prof2,    email: 'professor2@example.com',  role: Role.Professor,   name: 'Professor Two' },
  { id: IDS.prof3,    email: 'professor3@example.com',  role: Role.Professor,   name: 'Professor Three' },
  { id: IDS.tl1,      email: 'teamleader1@example.com', role: Role.TeamLeader,  name: 'Team Leader One',   teamId: IDS.group1 },
  { id: IDS.tl2,      email: 'teamleader2@example.com', role: Role.TeamLeader,  name: 'Team Leader Two',   teamId: IDS.group2 },
  { id: IDS.student1, email: 'student1@example.com',    role: Role.Student,     name: 'Student One',       teamId: IDS.group1 },
  { id: IDS.student2, email: 'student2@example.com',    role: Role.Student,     name: 'Student Two',       teamId: IDS.group1 },
  { id: IDS.student3, email: 'student3@example.com',    role: Role.Student,     name: 'Student Three',     teamId: IDS.group1 },
  { id: IDS.student4, email: 'student4@example.com',    role: Role.Student,     name: 'Student Four',      teamId: IDS.group2 },
  { id: IDS.student5, email: 'student5@example.com',    role: Role.Student,     name: 'Student Five',      teamId: IDS.group2 },
  { id: IDS.student6, email: 'student6@example.com',    role: Role.Student,     name: 'Student Six',       teamId: IDS.group2 },
];

async function main(): Promise<void> {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Make sure backend/.env is available.');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const userModel        = app.get<Model<UserDocument>>(getModelToken(User.name));
    const groupModel       = app.get<Model<GroupDocument>>(getModelToken(Group.name));
    const advisorReqModel  = app.get<Model<AdvisorRequestDocument>>(getModelToken(AdvisorRequest.name));
    const committeeModel   = app.get<Model<CommitteeDocument>>(getModelToken(Committee.name));
    const teamModel        = app.get<Model<TeamDocument>>(getModelToken(Team.name));
    const phaseModel       = app.get<Model<PhaseDocument>>(getModelToken(Phase.name));
    const submissionModel  = app.get<Model<SubmissionDocument>>(getModelToken(Submission.name));
    const sprintModel      = app.get<Model<SprintConfigDocument>>(getModelToken(SprintConfig.name));
    const spModel          = app.get<Model<StoryPointRecordDocument>>(getModelToken(StoryPointRecord.name));

    // ── 1. Users ─────────────────────────────────────────────────────────────
    log.log('Seeding users…');
    const passwordHash = await bcrypt.hash(PASSWORD, 12);

    for (const u of USERS) {
      await userModel.updateOne(
        { email: u.email },
        {
          $set: {
            email: u.email,
            passwordHash,
            role: u.role,
            ...(u.teamId ? { teamId: u.teamId } : {}),
          },
        },
        { upsert: true },
      );
      log.log(`  ${u.role.padEnd(12)} ${u.email}`);
    }

    // Retrieve _id values to use as leaderUserId in groups
    const tl1Doc = await userModel.findOne({ email: 'teamleader1@example.com' }).exec();
    const tl2Doc = await userModel.findOne({ email: 'teamleader2@example.com' }).exec();

    // ── 2. Groups ─────────────────────────────────────────────────────────────
    log.log('Seeding groups…');

    await groupModel.updateOne(
      { groupId: IDS.group1 },
      {
        $set: {
          groupId: IDS.group1,
          groupName: 'Alpha Team',
          leaderUserId: tl1Doc!._id.toString(),
          advisorUserId: IDS.prof1,
          assignedAdvisorId: IDS.prof1,
          status: GroupStatus.ACTIVE,
          assignmentStatus: GroupAssignmentStatus.ASSIGNED,
        },
      },
      { upsert: true },
    );
    log.log('  Group-1: Alpha Team (advisor assigned)');

    await groupModel.updateOne(
      { groupId: IDS.group2 },
      {
        $set: {
          groupId: IDS.group2,
          groupName: 'Beta Team',
          leaderUserId: tl2Doc!._id.toString(),
          advisorUserId: undefined,
          assignedAdvisorId: null,
          status: GroupStatus.ACTIVE,
          assignmentStatus: GroupAssignmentStatus.UNASSIGNED,
        },
      },
      { upsert: true },
    );
    log.log('  Group-2: Beta Team (no advisor yet)');

    // ── 3. Advisor request (approved) for Group-1 ────────────────────────────
    log.log('Seeding advisor request…');
    await advisorReqModel.updateOne(
      { groupId: IDS.group1, status: AdvisorRequestStatus.APPROVED },
      {
        $set: {
          requestId: 'f0000000-0000-0000-0000-000000000001',
          groupId: IDS.group1,
          submittedBy: tl1Doc!._id.toString(),
          requestedAdvisorId: IDS.prof1,
          status: AdvisorRequestStatus.APPROVED,
        },
      },
      { upsert: true },
    );
    log.log('  AdvisorRequest: Group-1 ← Professor One (APPROVED)');

    // ── 4. Committee ──────────────────────────────────────────────────────────
    log.log('Seeding committee…');
    await committeeModel.updateOne(
      { id: IDS.committee1 },
      {
        $set: {
          id: IDS.committee1,
          name: 'Spring 2026 Review Committee',
          jury: [
            { userId: IDS.coord1, name: 'Coordinator One' },
            { userId: IDS.coord2, name: 'Coordinator Two' },
          ],
          advisors: [
            { userId: IDS.prof1, name: 'Professor One' },
            { userId: IDS.prof2, name: 'Professor Two' },
          ],
          groups: [
            { groupId: IDS.group1, assignedAt: new Date(), assignedByUserId: IDS.coord1 },
            { groupId: IDS.group2, assignedAt: new Date(), assignedByUserId: IDS.coord1 },
          ],
        },
      },
      { upsert: true },
    );
    log.log('  Committee: Spring 2026 Review Committee (2 groups, 2 jury, 2 advisors)');

    // ── 5. Team (JIRA + GitHub) for Group-1 ──────────────────────────────────
    log.log('Seeding team…');
    await teamModel.updateOne(
      { leaderId: tl1Doc!._id.toString() },
      {
        $set: {
          name: 'Alpha Team',
          leaderId: tl1Doc!._id.toString(),
          jiraProjectKey: 'ALPHA',
          githubRepositoryId: 'org/alpha-repo',
        },
      },
      { upsert: true },
    );
    log.log('  Team: Alpha Team (jiraProjectKey=ALPHA, githubRepositoryId=org/alpha-repo)');

    // ── 6. Phase ──────────────────────────────────────────────────────────────
    log.log('Seeding phase…');
    const now = new Date();
    const oneMonthAgo = new Date(now); oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const oneMonthAhead = new Date(now); oneMonthAhead.setMonth(oneMonthAhead.getMonth() + 1);

    await phaseModel.updateOne(
      { phaseId: IDS.phase1 },
      {
        $set: {
          phaseId: IDS.phase1,
          submissionStart: oneMonthAgo,
          submissionEnd: oneMonthAhead,
          requiredFields: ['title', 'documents'],
        },
      },
      { upsert: true },
    );
    log.log('  Phase: open submission window (±1 month from today)');

    // ── 7. Submissions for Group-1 ────────────────────────────────────────────
    log.log('Seeding submissions…');
    await submissionModel.updateOne(
      { groupId: IDS.group1, type: 'SOW' },
      {
        $set: {
          title: 'Alpha Team — Statement of Work',
          groupId: IDS.group1,
          type: 'SOW',
          phaseId: IDS.phase1,
          status: 'Approved',
          submittedAt: new Date(),
          documents: [
            { originalName: 'sow.pdf', mimeType: 'application/pdf', uploadedAt: new Date() },
          ],
        },
      },
      { upsert: true },
    );
    await submissionModel.updateOne(
      { groupId: IDS.group1, type: 'RevisedProposal' },
      {
        $set: {
          title: 'Alpha Team — Revised Proposal',
          groupId: IDS.group1,
          type: 'RevisedProposal',
          phaseId: IDS.phase1,
          status: 'Approved',
          submittedAt: new Date(),
          documents: [
            { originalName: 'revised-proposal.pdf', mimeType: 'application/pdf', uploadedAt: new Date() },
          ],
        },
      },
      { upsert: true },
    );
    log.log('  Submissions: SOW + RevisedProposal for Group-1 (both Approved)');

    // ── 8. Sprint config for Group-1 (story points) ───────────────────────────
    log.log('Seeding sprint config…');
    await sprintModel.updateOne(
      { sprintId: IDS.sprint1, groupId: IDS.group1 },
      {
        $set: {
          sprintId: IDS.sprint1,
          groupId: IDS.group1,
          targetStoryPoints: 20,
          startDate: oneMonthAgo,
          endDate: oneMonthAhead,
          phase: 'SCRUM',
        },
      },
      { upsert: true },
    );
    log.log('  SprintConfig: Sprint-1 for Group-1 (target=20 pts, active window)');

    // ── 9. Story point records for Group-1 sprint ────────────────────────────
    log.log('Seeding story point records…');

    const spRecords = [
      { studentId: IDS.student1, completedPoints: 8 },
      { studentId: IDS.student2, completedPoints: 12 },
    ];

    for (const rec of spRecords) {
      await spModel.updateOne(
        { studentId: rec.studentId, sprintId: IDS.sprint1 },
        {
          $set: {
            studentId: rec.studentId,
            groupId: IDS.group1,
            sprintId: IDS.sprint1,
            completedPoints: rec.completedPoints,
            targetPoints: 20,
            source: StoryPointSource.JIRA_GITHUB,
          },
        },
        { upsert: true },
      );
    }
    log.log('  StoryPoints: student1=8 pts, student2=12 pts (source=JIRA_GITHUB)');

    // ── Summary ───────────────────────────────────────────────────────────────
    log.log('');
    log.log('═══════════════════════════════════════════════════');
    log.log('  SEED COMPLETE — test credentials');
    log.log('  Password for all accounts: SecurePass123!');
    log.log('───────────────────────────────────────────────────');
    log.log('  ROLE          EMAIL');
    for (const u of USERS) {
      log.log(`  ${u.role.padEnd(12)}  ${u.email}`);
    }
    log.log('───────────────────────────────────────────────────');
    log.log(`  Group-1 UUID : ${IDS.group1}`);
    log.log(`  Group-2 UUID : ${IDS.group2}`);
    log.log(`  Sprint UUID  : ${IDS.sprint1}`);
    log.log(`  Phase UUID   : ${IDS.phase1}`);
    log.log('═══════════════════════════════════════════════════');
  } finally {
    await app.close();
  }
}

void main().catch((err: unknown) => {
  log.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
