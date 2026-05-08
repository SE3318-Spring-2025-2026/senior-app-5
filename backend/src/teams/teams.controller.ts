import {
  Controller,
  Put,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Request,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamsSyncService } from './teams-sync.service';
import { TeamLeaderGuard } from './guards/team-leader.guard';
import { UpdateIntegrationsDto } from './dto/update-integrations.dto';
import { FinalizeSprintDto } from './dto/finalize-sprint.dto';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@ApiTags('Teams')
@Controller('teams')
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly teamsSyncService: TeamsSyncService,
  ) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List teams for dropdown selection (Coordinator, Admin, Professor)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Coordinator, Role.Admin, Role.Professor)
  @Get()
  @HttpCode(HttpStatus.OK)
  async listTeams() {
    return this.teamsService.listAll();
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get the Team owned by the current user, creating one on first call (TeamLeader)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TeamLeader, Role.Student)
  @Get('mine')
  @HttpCode(HttpStatus.OK)
  async getMyTeam(@Request() req: any) {
    const userId: string = req.user?.userId;
    const groupId: string | null = req.user?.groupId ?? null;
    const fallbackName = req.user?.email ? `${req.user.email}'s Team` : null;
    return this.teamsService.findOrCreateMyTeam(userId, {
      name: fallbackName,
      groupId,
    });
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update team integrations for JIRA and GitHub' })
  @UseGuards(TeamLeaderGuard)
  @Put(':teamId/integrations')
  async updateIntegrations(
    @Param('teamId') teamId: string,
    @Body() body: UpdateIntegrationsDto,
  ) {
    return this.teamsService.updateIntegrations(teamId, body);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Manually trigger JIRA/GitHub sync for Sprint Stories' })
  @UseGuards(TeamLeaderGuard)
  @Post(':teamId/sync')
  @HttpCode(HttpStatus.OK)
  async syncStories(@Param('teamId') teamId: string) {
    return this.teamsSyncService.syncStories(teamId);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get latest sprint story sync records' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Coordinator, Role.TeamLeader)
  @Get(':teamId/sync')
  @HttpCode(HttpStatus.OK)
  async getSyncResults(@Param('teamId') teamId: string) {
    return this.teamsSyncService.getLatestSync(teamId);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Finalize sprint: run last sync, lock stories, compute StoryPointRecords',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Coordinator, Role.Admin)
  @Post(':teamId/finalize-sprint')
  @HttpCode(HttpStatus.OK)
  async finalizeSprintSync(
    @Param('teamId') teamId: string,
    @Body() dto: FinalizeSprintDto,
  ) {
    return this.teamsSyncService.finalizeSprintSync(teamId, dto.sprintId, dto.groupId);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Advisor panel: live per-student sprint issue data with GitHub status',
  })
  @ApiQuery({ name: 'groupId', required: false })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Coordinator, Role.Admin, Role.Professor)
  @Get(':teamId/advisor-panel')
  @HttpCode(HttpStatus.OK)
  async getAdvisorPanel(
    @Param('teamId') teamId: string,
    @Query('groupId') groupId?: string,
  ) {
    return this.teamsSyncService.getAdvisorPanel(teamId, groupId);
  }
}
