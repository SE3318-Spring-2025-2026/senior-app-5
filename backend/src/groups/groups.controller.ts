import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { ListGroupsQueryDto } from './dto/list-groups-query.dto';
import { CommitteeGradeResultDto } from './dto/committee-grade-result.dto';
import { CreateMyTeamDto } from './dto/create-my-team.dto';
import { SendInviteDto } from './dto/send-invite.dto';
import { RespondToInviteDto } from './dto/respond-to-invite.dto';
import { CommitteesService } from '../committees/committees.service';
import { CommitteeResponseDto } from '../committees/dto/committee-response.dto';
import { CommitteeDocument } from '../committees/schemas/committee.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

interface RequestWithUser extends ExpressRequest {
  user: { userId?: string; sub?: string; _id?: string; role: string };
}

@ApiTags('Groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly committeesService: CommitteesService,
  ) {}

  @ApiOperation({
    summary:
      'List groups. Admin/Coordinator see all; Professor sees groups they advise; TeamLeader/Student see only their own group.',
  })
  @ApiOkResponse({ description: 'Paginated list of groups' })
  @Get()
  @Roles(Role.Admin, Role.Coordinator, Role.Professor, Role.TeamLeader, Role.Student)
  @HttpCode(HttpStatus.OK)
  async listGroups(
    @Query() query: ListGroupsQueryDto,
    @Request() req: RequestWithUser,
  ) {
    const callerId = req.user.userId ?? req.user.sub ?? req.user._id ?? '';
    const role = (req.user.role ?? '').toLowerCase();

    if (role === 'teamleader' || role === 'student') {
      // Members only see their own group. user.teamId === groupId in this app.
      const ownGroupId = (req.user as any).groupId ?? (req.user as any).teamId ?? null;
      if (!ownGroupId) {
        return { data: [], total: 0, page: query.page ?? 1, limit: query.limit ?? 20 };
      }
      return this.groupsService.findAll(
        query.page,
        query.limit,
        query.name,
        undefined,
        [ownGroupId],
      );
    }

    const advisorScope = role === 'professor' ? callerId : undefined;
    return this.groupsService.findAll(query.page, query.limit, query.name, advisorScope);
  }

  // ─── Student: create own team ─────────────────────────────────────────────
  @ApiOperation({ summary: 'Student creates their own team and becomes TeamLeader' })
  @ApiCreatedResponse({ description: 'Team created, caller promoted to TeamLeader' })
  @Post('my-team')
  @Roles(Role.Student)
  @HttpCode(HttpStatus.CREATED)
  async createMyTeam(
    @Body() dto: CreateMyTeamDto,
    @Request() req: RequestWithUser,
  ) {
    const userId = req.user.userId ?? req.user.sub ?? req.user._id ?? '';
    return this.groupsService.createGroupByStudent(userId, dto.groupName);
  }

  // ─── Student: view pending invites ────────────────────────────────────────
  @ApiOperation({ summary: 'Student views their pending team invites' })
  @ApiOkResponse({ description: 'List of pending invites for the logged-in student' })
  @Get('my-invites')
  @Roles(Role.Student, Role.TeamLeader)
  @HttpCode(HttpStatus.OK)
  async getMyInvites(@Request() req: RequestWithUser) {
    const userId = req.user.userId ?? req.user.sub ?? req.user._id ?? '';
    return this.groupsService.getPendingInvitesForUser(userId);
  }

  @ApiOperation({ summary: 'Get group details with leader, advisor and members' })
  @ApiOkResponse({ description: 'Group details returned' })
  @ApiNotFoundResponse({ description: 'Group not found' })
  @Get(':groupId')
  @Roles(Role.Admin, Role.Coordinator)
  @HttpCode(HttpStatus.OK)
  async getGroupDetails(@Param('groupId') groupId: string) {
    return this.groupsService.findGroupWithDetails(groupId);
  }

  @ApiOperation({ summary: 'Create a new group (Admin/Coordinator only)' })
  @ApiCreatedResponse({ description: 'Group created successfully' })
  @Post()
  @Roles(Role.Admin, Role.Coordinator)
  @HttpCode(HttpStatus.CREATED)
  async createGroup(@Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.createGroup(createGroupDto);
  }

  // ─── Student: respond to an invite ────────────────────────────────────────
  @ApiOperation({ summary: 'Student accepts or rejects a team invite' })
  @ApiOkResponse({ description: 'Invite response recorded' })
  @Patch('invites/:inviteId/respond')
  @Roles(Role.Student, Role.TeamLeader)
  @HttpCode(HttpStatus.OK)
  async respondToInvite(
    @Param('inviteId') inviteId: string,
    @Body() dto: RespondToInviteDto,
    @Request() req: RequestWithUser,
  ) {
    const userId = req.user.userId ?? req.user.sub ?? req.user._id ?? '';
    return this.groupsService.respondToInvite(inviteId, userId, dto.accept);
  }

  // ─── TeamLeader: send invite ───────────────────────────────────────────────
  @ApiOperation({ summary: 'TeamLeader sends a team invite to a student by email' })
  @ApiCreatedResponse({ description: 'Invite sent' })
  @Post(':groupId/invites')
  @Roles(Role.TeamLeader)
  @HttpCode(HttpStatus.CREATED)
  async sendInvite(
    @Param('groupId') groupId: string,
    @Body() dto: SendInviteDto,
    @Request() req: RequestWithUser,
  ) {
    const userId = req.user.userId ?? req.user.sub ?? req.user._id ?? '';
    return this.groupsService.sendInvite(groupId, userId, dto.invitedUserEmail);
  }

  // ─── TeamLeader: list invites with status ─────────────────────────────────
  @ApiOperation({ summary: 'TeamLeader views all invites for their group with statuses' })
  @ApiOkResponse({ description: 'Invite list with statuses' })
  @Get(':groupId/invites')
  @Roles(Role.TeamLeader)
  @HttpCode(HttpStatus.OK)
  async getGroupInvites(
    @Param('groupId') groupId: string,
    @Request() req: RequestWithUser,
  ) {
    const userId = req.user.userId ?? req.user.sub ?? req.user._id ?? '';
    return this.groupsService.getInvitesByGroup(groupId, userId);
  }


  @ApiOperation({ summary: 'Add a member to a group (by groupId UUID)' })
  @ApiCreatedResponse({ description: 'Member added to group successfully' })
  @Post(':groupId/members')
  @Roles(Role.Admin, Role.Coordinator)
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Param('groupId') groupId: string,
    @Body() body: AddMemberDto,
  ) {
    return this.groupsService.addMember(groupId, body.memberUserId);
  }

  @Get(':groupId/validate-statement-of-work')
  @ApiOperation({ summary: 'Check SoW status for a group' })
  @Roles(Role.Admin, Role.Coordinator, Role.Professor, Role.TeamLeader, Role.Student)
  async validateSow(@Param('groupId') groupId: string) {
    return this.groupsService.validateStatementOfWork(groupId);
  }

  @ApiOperation({
    operationId: 'getCommitteeByGroupId',
    summary: 'Get the committee assigned to a group (any authenticated user)',
  })
  @ApiOkResponse({ description: 'Committee found', type: CommitteeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Authenticated but forbidden by policy' })
  @ApiNotFoundResponse({ description: 'Group not found or no committee assigned' })
  @Roles(Role.Admin, Role.Coordinator, Role.Professor, Role.TeamLeader, Role.Student)
  @Get(':groupId/committee')
  @HttpCode(HttpStatus.OK)
  async getCommitteeByGroupId(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Request() req: RequestWithUser,
  ): Promise<CommitteeResponseDto> {
    const correlationId = (req.headers['x-correlation-id'] as string) ?? undefined;
    const committee = await this.committeesService.getCommitteeByGroupId(
      groupId,
      correlationId,
    );
    return this.toResponseDto(committee);
  }

  @ApiOperation({
    operationId: 'getCommitteeGrade',
    summary: 'Aggregate committee member grades for a deliverable (COORDINATOR, ADVISOR, ADMIN)',
  })
  @ApiOkResponse({ description: 'Aggregated committee grade returned', type: CommitteeGradeResultDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Valid token but insufficient role' })
  @ApiNotFoundResponse({ description: 'No committee evaluation records found for this group/deliverable' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected internal failure' })
  @Roles(Role.Coordinator, Role.Professor, Role.Admin)
  @Get(':groupId/deliverables/:deliverableId/committee-grade')
  @HttpCode(HttpStatus.OK)
  async getCommitteeGrade(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Param('deliverableId', new ParseUUIDPipe()) deliverableId: string,
    @Request() req: RequestWithUser,
  ): Promise<CommitteeGradeResultDto> {
    const correlationId = (req.headers['x-correlation-id'] as string) ?? undefined;
    return this.groupsService.getCommitteeGrade(groupId, deliverableId, correlationId);
  }

  private toResponseDto(committee: CommitteeDocument): CommitteeResponseDto {
    return {
      id: committee.id,
      name: committee.name,
      createdAt: (committee as any).createdAt as Date,
      updatedAt: (committee as any).updatedAt as Date | null,
      jury: (committee.jury as any[]).map((j) => ({
        userId: j.userId,
        name: j.name,
      })),
      advisors: (committee.advisors as any[]).map((a) => ({
        userId: a.userId,
        name: a.name,
      })),
      groups: (committee.groups as any[]).map((g) => ({
        groupId: g.groupId,
        assignedAt: g.assignedAt,
        assignedByUserId: g.assignedByUserId,
      })),
    };
  }
}
