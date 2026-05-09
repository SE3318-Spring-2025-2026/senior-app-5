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
import { SprintConfig, SprintConfigSchema } from '../story-points/schemas/sprint-config.schema';
import { StoryPointRecord, StoryPointRecordSchema } from '../story-points/schemas/story-point-record.schema';
import { Group, GroupSchema } from '../groups/group.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    AiModule,
    MongooseModule.forFeature([
      { name: Team.name, schema: TeamSchema },
      { name: SprintStory.name, schema: SprintStorySchema },
      { name: User.name, schema: UserSchema },
      { name: SprintConfig.name, schema: SprintConfigSchema },
      { name: StoryPointRecord.name, schema: StoryPointRecordSchema },
      { name: Group.name, schema: GroupSchema },
    ]),
  ],
  controllers: [TeamsController],
  providers: [TeamsService, TeamsSyncService, TeamsCronService],
  exports: [TeamsService, TeamsSyncService],
})
export class TeamsModule {}
