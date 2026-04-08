import { Controller, Put, Param, Body, UseGuards } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamLeaderGuard } from './guards/team-leader.guard';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  
  @UseGuards(TeamLeaderGuard)
  @Put(':teamId/integrations')
  async updateIntegrations(
    @Param('teamId') teamId: string,
    @Body('jiraProjectKey') jiraProjectKey: string,
    @Body('githubRepositoryId') githubRepositoryId: string,
  ) {
    return this.teamsService.updateIntegrations(
      teamId,
      jiraProjectKey,
      githubRepositoryId,
    );
  }
}