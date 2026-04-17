import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { CommitteesService } from './committees.service';
import { CreateCommitteeDto } from './dto/create-committee.dto';
import { CommitteeResponseDto } from './dto/committee-response.dto';
import { CommitteeDocument } from './schemas/committee.schema';
import { ListCommitteeGroupsQueryDto } from './dto/list-committee-groups-query.dto';
import { CommitteeGroupPageDto } from './dto/committee-group-page.dto';
import { ListCommitteeAdvisorsQueryDto } from './dto/list-committee-advisors-query.dto';
import { CommitteeAdvisorPageDto } from './dto/committee-advisor-page.dto';
import { ListCommitteesQueryDto } from './dto/list-committees-query.dto';
import { CommitteePageDto } from './dto/committee-page.dto';
import { AssignCommitteeGroupDto } from './dto/assign-committee-group.dto';
import { CommitteeGroupResponseDto } from './dto/committee-group-response.dto';

interface RequestWithUser extends ExpressRequest {
  user: { userId?: string; sub?: string; _id?: string; role: string };
}

@ApiTags('Committees')
@Controller('committees')
export class CommitteesController {
  constructor(private readonly committeesService: CommitteesService) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({
    operationId: 'listCommittees',
    summary: 'List committees with pagination (COORDINATOR only)',
  })
  @ApiOkResponse({
    description: 'Committees returned successfully',
    type: CommitteePageDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({
    description: 'Valid token but insufficient permissions',
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Coordinator)
  @Get()
  @HttpCode(HttpStatus.OK)
  async listCommittees(
    @Query() query: ListCommitteesQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<CommitteePageDto> {
    const correlationId =
      (req.headers['x-correlation-id'] as string) ?? undefined;
    return this.committeesService.listCommittees(
      query,
      req.user.role,
      correlationId,
    );
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    operationId: 'createCommittee',
    summary: 'Create a new committee (COORDINATOR only)',
  })
  @ApiCreatedResponse({
    description: 'Committee created successfully',
    type: CommitteeResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({
    description: 'Valid token but insufficient permissions',
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Coordinator)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCommittee(
    @Body() dto: CreateCommitteeDto,
    @Request() req: RequestWithUser,
  ): Promise<CommitteeResponseDto> {
    const coordinatorId =
      req.user.userId ?? req.user.sub ?? req.user._id ?? 'unknown';
    const correlationId =
      (req.headers['x-correlation-id'] as string) ?? undefined;

    const committee = await this.committeesService.createCommittee(
      dto,
      coordinatorId,
      correlationId,
    );

    return this.toResponseDto(committee);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    operationId: 'getCommitteeById',
    summary: 'Get a committee by its ID (any authenticated user)',
  })
  @ApiOkResponse({ description: 'Committee found', type: CommitteeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({
    description: 'Authenticated but forbidden by policy',
  })
  @ApiNotFoundResponse({ description: 'Committee not found' })
  @UseGuards(AuthGuard('jwt'))
  @Get(':committeeId')
  @HttpCode(HttpStatus.OK)
  async getCommitteeById(
    @Param('committeeId', new ParseUUIDPipe()) committeeId: string,
    @Request() req: RequestWithUser,
  ): Promise<CommitteeResponseDto> {
    const correlationId =
      (req.headers['x-correlation-id'] as string) ?? undefined;
    const committee = await this.committeesService.getCommitteeById(
      committeeId,
      correlationId,
    );
    return this.toResponseDto(committee);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    operationId: 'listCommitteeAdvisors',
    summary: 'List advisors assigned to a committee (COORDINATOR only)',
    description:
      'Returns paginated advisor assignments for a committee. Each item includes advisorUserId and assignedAt. committeeId is not repeated in items.',
  })
  @ApiOkResponse({
    description: 'Committee advisors returned successfully',
    type: CommitteeAdvisorPageDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({
    description: 'Valid token but insufficient permissions',
  })
  @ApiNotFoundResponse({ description: 'Committee not found' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Coordinator)
  @Get(':committeeId/advisors')
  @HttpCode(HttpStatus.OK)
  async listCommitteeAdvisors(
    @Param('committeeId', new ParseUUIDPipe()) committeeId: string,
    @Query() query: ListCommitteeAdvisorsQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<CommitteeAdvisorPageDto> {
    const correlationId =
      (req.headers['x-correlation-id'] as string) ?? undefined;
    return this.committeesService.listCommitteeAdvisors(
      committeeId,
      query,
      correlationId,
    );
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    operationId: 'listCommitteeGroups',
    summary: 'List groups assigned to a committee (COORDINATOR only)',
    description:
      'Returns paginated group assignments for a committee. Each item includes groupId and assignedAt. committeeId is not repeated in items.',
  })
  @ApiOkResponse({
    description: 'Committee groups returned successfully',
    type: CommitteeGroupPageDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({
    description: 'Valid token but insufficient permissions',
  })
  @ApiNotFoundResponse({ description: 'Committee not found' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Coordinator)
  @Get(':committeeId/groups')
  @HttpCode(HttpStatus.OK)
  async listCommitteeGroups(
    @Param('committeeId', new ParseUUIDPipe()) committeeId: string,
    @Query() query: ListCommitteeGroupsQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<CommitteeGroupPageDto> {
    const correlationId =
      (req.headers['x-correlation-id'] as string) ?? undefined;
    return this.committeesService.listCommitteeGroups(
      committeeId,
      query,
      correlationId,
    );
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    operationId: 'removeJuryMember',
    summary: 'Remove a jury member from a committee (COORDINATOR only)',
  })
  @ApiNoContentResponse({ description: 'Jury member removed successfully' })
    operationId: 'assignGroupToCommittee',
    summary: 'Assign a group to a committee (COORDINATOR only)',
  })
  @ApiCreatedResponse({
    description: 'Group assigned successfully',
    type: CommitteeGroupResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({
    description: 'Valid token but insufficient permissions',
  })
  @ApiNotFoundResponse({
    description: 'Committee or jury assignment not found',
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Coordinator)
  @Delete(':committeeId/jury-members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeJuryMember(
    @Param('committeeId', new ParseUUIDPipe()) committeeId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Request() req: RequestWithUser,
  ): Promise<void> {
  @ApiNotFoundResponse({ description: 'Committee or group not found' })
  @ApiConflictResponse({
    description: 'Group is already assigned to a committee',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Group does not have a confirmed advisor assignment',
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Coordinator)
  @Post(':committeeId/groups')
  @HttpCode(HttpStatus.CREATED)
  async assignGroupToCommittee(
    @Param('committeeId', new ParseUUIDPipe()) committeeId: string,
    @Body() dto: AssignCommitteeGroupDto,
    @Request() req: RequestWithUser,
  ): Promise<CommitteeGroupResponseDto> {
    const coordinatorId =
      req.user.userId ?? req.user.sub ?? req.user._id ?? 'unknown';
    const correlationId =
      (req.headers['x-correlation-id'] as string) ?? undefined;
    await this.committeesService.removeJuryMember(
      committeeId,
      userId,

    return this.committeesService.assignGroupToCommittee(
      committeeId,
      dto,
      coordinatorId,
      correlationId,
    );
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    operationId: 'removeCommitteeAdvisor',
    summary: 'Unlink an advisor from a committee (COORDINATOR only)',
  })
  @ApiNoContentResponse({ description: 'Advisor link removed successfully' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({
    description: 'Valid token but insufficient permissions',
  })
  @ApiNotFoundResponse({
    description: 'Committee or advisor link not found',
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Coordinator)
  @Delete(':committeeId/advisors/:advisorUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCommitteeAdvisor(
    @Param('committeeId', new ParseUUIDPipe()) committeeId: string,
    @Param('advisorUserId', new ParseUUIDPipe()) advisorUserId: string,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    const coordinatorId =
      req.user.userId ?? req.user.sub ?? req.user._id ?? 'unknown';
    const correlationId =
      (req.headers['x-correlation-id'] as string) ?? undefined;

    await this.committeesService.removeCommitteeAdvisor(
      committeeId,
      advisorUserId,
      coordinatorId,
      correlationId,
    );
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
