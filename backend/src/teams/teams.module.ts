import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { TeamsService } from './teams.service';
import { TeamsSyncService } from './teams-sync.service';
import { TeamsCronService } from './teams-cron.service';
import { TeamsController } from './teams.controller';
import { Team, TeamSchema } from './schemas/team.schema';
import { SprintStory, SprintStorySchema } from './schemas/sprint-story.schema';
import { User, UserSchema } from '../users/data/user.schema';
import {
  SprintConfigEntry,
  SprintConfigEntrySchema,
} from '../sprint-configs/schemas/sprint-config.schema';
import { StoryPointRecord, StoryPointRecordSchema } from '../story-points/schemas/story-point-record.schema';
import { Group, GroupSchema } from '../groups/group.entity';
import {
  Schedule,
  ScheduleSchema,
} from '../advisors/schemas/schedule.schema';
import {
  GroupFinalGrade,
  GroupFinalGradeSchema,
  StudentFinalGrade,
  StudentFinalGradeSchema,
} from '../grades/schemas/grade-records.schema';
import { AiModule } from '../ai/ai.module';
import { GradesModule } from '../grades/grades.module';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    AiModule,
    MongooseModule.forFeature([
      { name: Team.name, schema: TeamSchema },
      { name: SprintStory.name, schema: SprintStorySchema },
      { name: User.name, schema: UserSchema },
      { name: SprintConfigEntry.name, schema: SprintConfigEntrySchema },
      { name: StoryPointRecord.name, schema: StoryPointRecordSchema },
      { name: Group.name, schema: GroupSchema },
      { name: Schedule.name, schema: ScheduleSchema },
      { name: GroupFinalGrade.name, schema: GroupFinalGradeSchema },
      { name: StudentFinalGrade.name, schema: StudentFinalGradeSchema },
    ]),
    GradesModule,
  ],
  controllers: [TeamsController],
  providers: [TeamsService, TeamsSyncService, TeamsCronService],
  exports: [TeamsService, TeamsSyncService],
})
export class TeamsModule {}
