import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { TeamsService } from './teams.service';
import { TeamsSyncService } from './teams-sync.service'; 
import { TeamsController } from './teams.controller';
import { Team, TeamSchema } from './schemas/team.schema';
import { SprintStory, SprintStorySchema } from './schemas/sprint-story.schema'; 

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: Team.name, schema: TeamSchema },
      { name: SprintStory.name, schema: SprintStorySchema },
    ]),
  ],
  controllers: [TeamsController],
  providers: [TeamsService, TeamsSyncService], 
  exports: [TeamsService, TeamsSyncService],
})
export class TeamsModule {}
