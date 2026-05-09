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
  ForbiddenException,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamsSyncService } from './teams-sync.service';
import { GradesService } from '../grades/grades.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team, TeamDocument } from './schemas/team.schema';
import { User, UserDocument } from '../users/data/user.schema';
import { TeamLeaderGuard } from './guards/team-leader.guard';
import { UpdateIntegrationsDto } from './dto/update-integrations.dto';
import { JiraDiscoverDto } from './dto/jira-discover.dto';
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
    private readonly gradesService: GradesService,
    @InjectModel(Team.name) private readonly teamModel: Model<TeamDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'List teams for dropdown selection (Coordinator/Admin see all; Professor sees only teams of groups they advise)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Coordinator, Role.Admin, Role.Professor)
  @Get()
  @HttpCode(HttpStatus.OK)
  async listTeams(@Request() req: any) {
    const isProfessor = (req.user?.role ?? '').toLowerCase() === 'professor';
    if (isProfessor) {
      const callerId = req.user?.userId ?? req.user?.sub ?? req.user?._id;
      const advisedGroupIds = await this.teamsService.findGroupIdsAdvisedBy(callerId);
      return this.teamsService.listAll(advisedGroupIds);
    }
    return this.teamsService.listAll();
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get the Team owned by the current TeamLeader, creating one on first call',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TeamLeader)
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
  @ApiOperation({
    summary:
      'Discover JIRA configuration (boards, story points field, accountId) without persisting anything. Used by the wizard to auto-fill the integration form.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TeamLeader, Role.Coordinator, Role.Admin)
  @Post('jira/discover')
  @HttpCode(HttpStatus.OK)
  async jiraDiscover(@Body() body: JiraDiscoverDto) {
    return this.teamsService.discoverJira(body);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update team integrations for JIRA and GitHub' })
  @UseGuards(JwtAuthGuard, TeamLeaderGuard)
  @Put(':teamId/integrations')
  async updateIntegrations(
    @Param('teamId') teamId: string,
    @Body() body: UpdateIntegrationsDto,
  ) {
    return this.teamsService.updateIntegrations(teamId, body);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Live integration health check (JIRA + GitHub) for the team',
  })
  @UseGuards(JwtAuthGuard, TeamLeaderGuard)
  @Get(':teamId/integrations/status')
  @HttpCode(HttpStatus.OK)
  async getIntegrationStatus(@Param('teamId') teamId: string) {
    return this.teamsSyncService.getIntegrationStatus(teamId);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Manually trigger JIRA/GitHub sync for Sprint Stories (TeamLeader of this team, Coordinator, Admin, or the Professor advising the team)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TeamLeader, Role.Coordinator, Role.Admin, Role.Professor)
  @Post(':teamId/sync')
  @HttpCode(HttpStatus.OK)
  async syncStories(@Param('teamId') teamId: string, @Request() req: any) {
    const role = (req.user?.role ?? '').toLowerCase();
    const callerId = req.user?.userId ?? req.user?.sub ?? req.user?._id;

    if (role === 'teamleader') {
      const team = await this.teamsService.findByIdOrGroupId(teamId);
      if (!team || team.leaderId !== callerId) {
        throw new ForbiddenException('You can only sync your own team.');
      }
    } else if (role === 'professor') {
      const team = await this.teamsService.findByIdOrGroupId(teamId);
      const advisedGroupIds = await this.teamsService.findGroupIdsAdvisedBy(callerId);
      if (!team || !team.groupId || !advisedGroupIds.includes(team.groupId)) {
        throw new ForbiddenException(
          'You can only sync teams in groups you advise.',
        );
      }
    }

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
    summary:
      'Coordinator: finalize a sprint for ALL JIRA-configured teams and recalculate grades for each affected group.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Coordinator)
  @Post('finalize-sprint-all')
  @HttpCode(HttpStatus.OK)
  async finalizeSprintForAllTeams(
    @Body() body: { sprintId: string },
    @Request() req: any,
  ) {
    const sprintId = body?.sprintId;
    if (!sprintId) {
      throw new ForbiddenException('sprintId is required.');
    }

    const teams = await this.teamModel
      .find({
        jiraDomain: { $exists: true, $ne: '' },
        jiraApiToken: { $exists: true, $ne: '' },
        jiraProjectKey: { $exists: true, $ne: '' },
        jiraEmail: { $exists: true, $ne: '' },
        groupId: { $exists: true, $ne: '' },
      })
      .select('_id name groupId')
      .lean()
      .exec();

    const teamResults: {
      teamId: string;
      teamName: string;
      groupId: string;
      ok: boolean;
      error?: string;
      lockedCount?: number;
      studentRecords?: { studentId: string; completedPoints: number; targetPoints: number }[];
    }[] = [];

    for (const team of teams) {
      const teamId = (team._id as any).toString();
      try {
        const r = await this.teamsSyncService.finalizeSprintSync(teamId, sprintId);
        teamResults.push({
          teamId,
          teamName: (team as any).name,
          groupId: (team as any).groupId,
          ok: true,
          lockedCount: r.lockedCount,
          studentRecords: r.studentRecords,
        });
      } catch (err: any) {
        teamResults.push({
          teamId,
          teamName: (team as any).name,
          groupId: (team as any).groupId,
          ok: false,
          error: err?.message ?? 'unknown error',
        });
      }
    }

    // Resolve student names/emails for every studentId returned across all teams.
    const allStudentIds = [
      ...new Set(
        teamResults
          .filter((r) => r.ok && r.studentRecords)
          .flatMap((r) => r.studentRecords!.map((s) => s.studentId)),
      ),
    ];

    if (allStudentIds.length > 0) {
      const users = await this.userModel
        .find({ _id: { $in: allStudentIds } })
        .select('_id firstName lastName name email')
        .lean()
        .exec();
      const userMap = new Map<string, { name: string | null; email: string | null }>(
        (users as any[]).map((u) => [
          String(u._id),
          {
            name:
              [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
              (u.name as string | undefined) ||
              null,
            email: u.email ?? null,
          },
        ]),
      );
      for (const r of teamResults) {
        if (r.ok && r.studentRecords) {
          (r as any).studentRecords = r.studentRecords.map((s) => ({
            ...s,
            studentName: userMap.get(s.studentId)?.name ?? null,
            studentEmail: userMap.get(s.studentId)?.email ?? null,
          }));
        }
      }
    }

    const triggeredBy = req?.user?.userId ?? req?.user?.id ?? 'coordinator';

    const uniqueGroupIds = [...new Set(teamResults.filter((r) => r.ok).map((r) => r.groupId))];
    const gradeResults: { groupId: string; ok: boolean; error?: string; teamGrade?: number }[] = [];
    for (const groupId of uniqueGroupIds) {
      try {
        const g = await this.gradesService.calculateGrade(
          groupId,
          { force: true },
          triggeredBy,
        );
        gradeResults.push({ groupId, ok: true, teamGrade: g.teamGrade });
      } catch (err: any) {
        gradeResults.push({
          groupId,
          ok: false,
          error: err?.message ?? 'unknown error',
        });
      }
    }

    return { sprintId, teamResults, gradeResults };
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Story points summary for the team (completed vs total)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Coordinator, Role.TeamLeader)
  @Get(':teamId/story-points')
  @HttpCode(HttpStatus.OK)
  async getStoryPointsSummary(@Param('teamId') teamId: string) {
    return this.teamsSyncService.getStoryPointsSummary(teamId);
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
    @Request() req: any,
    @Query('groupId') groupId?: string,
  ) {
    const isProfessor = (req.user?.role ?? '').toLowerCase() === 'professor';
    if (isProfessor) {
      const callerId = req.user?.userId ?? req.user?.sub ?? req.user?._id;
      const team = await this.teamsService.findByIdOrGroupId(teamId);
      const advisedGroupIds = await this.teamsService.findGroupIdsAdvisedBy(callerId);
      if (!team || !team.groupId || !advisedGroupIds.includes(team.groupId)) {
        throw new ForbiddenException(
          'You can only view sprint data for teams in groups you advise.',
        );
      }
    }
    return this.teamsSyncService.getAdvisorPanel(teamId, groupId);
  }
}
