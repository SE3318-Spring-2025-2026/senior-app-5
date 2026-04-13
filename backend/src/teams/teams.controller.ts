import { Controller, Put, Param, Body, UseGuards } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamLeaderGuard } from './guards/team-leader.guard';
import { UpdateIntegrationsDto } from './dto/update-integrations.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update team integrations for Jira and GitHub' })
  @UseGuards(TeamLeaderGuard)
  @Put(':teamId/integrations')
  async updateIntegrations(
    @Param('teamId') teamId: string,
    @Body() body: UpdateIntegrationsDto,
  ) {
    return this.teamsService.updateIntegrations(
      teamId,
      body.jiraProjectKey,
      body.githubRepositoryId,
    );
  }
}
