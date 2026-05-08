import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StoryPointsController } from './story-points.controller';
import { StoryPointsService } from './story-points.service';
import { JiraGithubService } from './jira-github.service';
import {
  StoryPointRecord,
  StoryPointRecordSchema,
} from './schemas/story-point-record.schema';
import { User, UserSchema } from '../users/data/user.schema';
import {
  SprintConfigEntry,
  SprintConfigEntrySchema,
} from '../sprint-configs/schemas/sprint-config.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StoryPointRecord.name, schema: StoryPointRecordSchema },
      { name: SprintConfigEntry.name, schema: SprintConfigEntrySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [StoryPointsController],
  providers: [StoryPointsService, JiraGithubService],
  exports: [StoryPointsService],
})
export class StoryPointsModule {}
