import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { Group, GroupSchema } from './group.entity';
import {
  Submission,
  SubmissionSchema,
} from '../submissions/schemas/submission.schema';
import {
  CommitteeEvaluation,
  CommitteeEvaluationSchema,
} from './schemas/committee-evaluation.schema';
import { CommitteesModule } from '../committees/committees.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { User, UserSchema } from '../users/data/user.schema';
import { Committee, CommitteeSchema } from '../committees/schemas/committee.schema';
import { TeamInvite, TeamInviteSchema } from './schemas/team-invite.schema';
import { Team, TeamSchema } from '../teams/schemas/team.schema';

@Module({
  imports: [
    CommitteesModule,
    SubmissionsModule,
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: User.name, schema: UserSchema },
      { name: CommitteeEvaluation.name, schema: CommitteeEvaluationSchema },
      { name: Committee.name, schema: CommitteeSchema },
      { name: TeamInvite.name, schema: TeamInviteSchema },
      { name: Team.name, schema: TeamSchema },
    ]),
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
