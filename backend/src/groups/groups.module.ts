import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { Group, GroupSchema } from './group.entity';
import { Submission, SubmissionSchema } from '../submissions/schemas/submission.schema';
import { CommitteeGroupsController } from './committee-groups.controller';
import { CommitteeGroupAssignment, CommitteeGroupAssignmentSchema } from './schemas/committee-group-assignment.schema';
import { AdvisorRequest, AdvisorRequestSchema } from './schemas/advisor-request.schema';
import { User, UserSchema } from '../users/data/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Group.name, schema: GroupSchema }]),
    MongooseModule.forFeature([{ name: Submission.name, schema: SubmissionSchema }]),
    MongooseModule.forFeature([{ name: CommitteeGroupAssignment.name, schema: CommitteeGroupAssignmentSchema }]),
    MongooseModule.forFeature([{ name: AdvisorRequest.name, schema: AdvisorRequestSchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [GroupsController, CommitteeGroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
