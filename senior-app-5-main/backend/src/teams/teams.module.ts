import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Team, TeamSchema } from './schemas/team.schema';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { TeamLeaderGuard } from './guards/team-leader.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Team.name, schema: TeamSchema }]),
  ],
  controllers: [TeamsController],
  providers: [TeamsService, TeamLeaderGuard],
  exports: [TeamsService],
})
export class TeamsModule {}
