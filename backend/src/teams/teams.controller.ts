import { Controller, Put, Post, Get, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamsSyncService } from './teams-sync.service'; // ADDED: Import the new sync service
import { TeamLeaderGuard } from './guards/team-leader.guard';
import { UpdateIntegrationsDto } from './dto/update-integrations.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// ADDED: Import Auth and Role guards for the new GET endpoint
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@ApiTags('Teams')
@Controller('teams')
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly teamsSyncService: TeamsSyncService, // ADDED: Inject the new sync service
  ) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update team integrations for Jira and GitHub' })
  @UseGuards(TeamLeaderGuard)
  @Put(':teamId/integrations')
  async updateIntegrations(
    @Param('teamId') teamId: string,
    @Body() body: UpdateIntegrationsDto,
  ) {
    return this.teamsService.updateIntegrations(teamId, body);
  }

  // --- ADDED FOR PROCESS 9: SPRINT STORY SYNC ---

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Manually trigger JIRA and GitHub sync for Sprint Stories' })
  @UseGuards(TeamLeaderGuard) // REQUIREMENT: Only TeamLeader can trigger manual sync
  @Post(':teamId/sync')
  @HttpCode(HttpStatus.OK)
  async syncStories(@Param('teamId') teamId: string) {
    return this.teamsSyncService.syncStories(teamId);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get latest sprint story sync records' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Coordinator, Role.TeamLeader) // REQUIREMENT: Coordinator and TeamLeader can read
  @Get(':teamId/sync')
  @HttpCode(HttpStatus.OK)
  async getSyncResults(@Param('teamId') teamId: string) {
    return this.teamsSyncService.getLatestSync(teamId);
  }
}
