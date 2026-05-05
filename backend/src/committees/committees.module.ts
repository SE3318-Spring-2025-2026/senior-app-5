import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Committee, CommitteeSchema } from './schemas/committee.schema';
import { CommitteesService } from './committees.service';
import { CommitteesController } from './committees.controller';
import { Group, GroupSchema } from '../groups/group.entity';
import { Schedule, ScheduleSchema } from '../advisors/schemas/schedule.schema';
import { Submission, SubmissionSchema } from '../submissions/schemas/submission.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Committee.name, schema: CommitteeSchema },
      { name: Group.name, schema: GroupSchema },
      { name: Schedule.name, schema: ScheduleSchema },
      { name: Submission.name, schema: SubmissionSchema },
    ]),
  ],
  controllers: [CommitteesController],
  providers: [CommitteesService],
  exports: [CommitteesService],
})
export class CommitteesModule {}
