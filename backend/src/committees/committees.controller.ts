import {
  Body,
  Controller,
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
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
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

interface RequestWithUser extends ExpressRequest {
  user: { userId?: string; sub?: string; _id?: string; role: string };
}

@ApiTags('Committees')
@Controller('committees')
export class CommitteesController {
  constructor(private readonly committeesService: CommitteesService) {}

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
