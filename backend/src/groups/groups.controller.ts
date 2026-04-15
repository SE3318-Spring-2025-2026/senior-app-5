import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { CommitteesService } from '../committees/committees.service';
import { CommitteeResponseDto } from '../committees/dto/committee-response.dto';
import { CommitteeDocument } from '../committees/schemas/committee.schema';

interface RequestWithUser extends ExpressRequest {
  user: { userId?: string; sub?: string; _id?: string; role: string };
}

@ApiTags('Groups')
@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly committeesService: CommitteesService,
  ) {}

  @ApiOperation({ summary: 'Create a new group' })
  @ApiCreatedResponse({ description: 'Group created successfully' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createGroup(@Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.createGroup(createGroupDto);
  }

  @Get(':groupId/validate-statement-of-work')
  async validateSow(@Param('groupId') groupId: string) {
    return this.groupsService.validateStatementOfWork(groupId);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    operationId: 'getCommitteeByGroupId',
    summary: 'Get the committee assigned to a group (any authenticated user)',
  })
  @ApiOkResponse({ description: 'Committee found', type: CommitteeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({
    description: 'Authenticated but forbidden by policy',
  })
  @ApiNotFoundResponse({
    description: 'Group not found or no committee assigned',
  })
  @UseGuards(AuthGuard('jwt'))
  @Get(':groupId/committee')
  @HttpCode(HttpStatus.OK)
  async getCommitteeByGroupId(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Request() req: RequestWithUser,
  ): Promise<CommitteeResponseDto> {
    const correlationId =
      (req.headers['x-correlation-id'] as string) ?? undefined;
    const committee = await this.committeesService.getCommitteeByGroupId(
      groupId,
      correlationId,
    );
    return this.toResponseDto(committee);
  }

  private toResponseDto(committee: CommitteeDocument): CommitteeResponseDto {
    return {
      id: committee.id,
      name: committee.name,
      createdAt: (committee as any).createdAt as Date,
      updatedAt: (committee as any).updatedAt as Date | null,
      jury: (committee.jury as any[]).map((j) => ({ userId: j.userId, name: j.name })),
      advisors: (committee.advisors as any[]).map((a) => ({ userId: a.userId, name: a.name })),
      groups: (committee.groups as any[]).map((g) => ({
        groupId: g.groupId,
        assignedAt: g.assignedAt,
        assignedByUserId: g.assignedByUserId,
      })),
    };
  }
}
