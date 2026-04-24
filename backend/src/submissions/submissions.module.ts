import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { PhasesModule } from '../phases/phases.module';
import { Submission, SubmissionSchema } from './schemas/submission.schema';
import { GroupMemberGuard } from '../auth/guards/group-member.guard';
import { Group, GroupSchema } from '../groups/group.entity';
import { User, UserSchema } from '../users/data/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Submission.name, schema: SubmissionSchema },
      { name: Group.name, schema: GroupSchema },
      { name: User.name, schema: UserSchema },
    ]),
    PhasesModule,
  ],
  controllers: [SubmissionsController],
  providers: [
    SubmissionsService,
    GroupMemberGuard
  ],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
