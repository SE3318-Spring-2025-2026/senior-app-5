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
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { StoryPointsService } from './story-points.service';
import { FetchStoryPointsDto } from './dto/fetch-story-points.dto';
import { OverrideStoryPointsDto } from './dto/override-story-points.dto';
import {
  StoryPointSummaryDto,
  StudentStoryPointRecordDto,
} from './dto/story-point-summary.dto';

interface RequestWithUser extends ExpressRequest {
  user: { userId?: string; sub?: string; role: string };
}

@ApiTags('Story Points')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('groups/:groupId/sprints/:sprintId/story-points')
export class StoryPointsController {
  constructor(private readonly storyPointsService: StoryPointsService) {}

  @Post()
  @Roles(Role.Coordinator, Role.Professor)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'fetchAndVerifyStoryPoints',
    summary: 'Fetch and verify story points from JIRA/GitHub per student per sprint',
  })
  @ApiOkResponse({ description: 'Story points fetched and verified', type: StoryPointSummaryDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Requires COORDINATOR or ADVISOR role' })
  @ApiNotFoundResponse({ description: 'Group, sprint config, or student not found' })
  @ApiUnprocessableEntityResponse({ description: 'Sprint config missing or no active sprint window' })
  @ApiBadGatewayResponse({ description: 'JIRA/GitHub API unreachable' })
  async fetchAndVerify(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Param('sprintId', new ParseUUIDPipe()) sprintId: string,
    @Body() dto: FetchStoryPointsDto,
    @Request() req: RequestWithUser,
  ): Promise<StoryPointSummaryDto> {
    const requestedBy = req.user.userId ?? req.user.sub ?? 'unknown';
    return this.storyPointsService.fetchAndVerify(groupId, sprintId, dto, requestedBy);
  }

  @Get()
  @Roles(Role.Coordinator, Role.Professor)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'getStoryPoints',
    summary: 'Get story point records for a group sprint',
  })
  @ApiOkResponse({ description: 'Story point records returned', type: StoryPointSummaryDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Requires COORDINATOR or ADVISOR role' })
  @ApiUnprocessableEntityResponse({ description: 'Sprint config not found' })
  async getStoryPoints(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Param('sprintId', new ParseUUIDPipe()) sprintId: string,
  ): Promise<StoryPointSummaryDto> {
    return this.storyPointsService.getRecords(groupId, sprintId);
  }

  @Patch('override')
  @Roles(Role.Coordinator)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'overrideStoryPoints',
    summary: 'Override story points for a student (COORDINATOR only)',
  })
  @ApiOkResponse({
    description: 'Story point record updated with COORDINATOR_OVERRIDE',
    type: StudentStoryPointRecordDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Requires COORDINATOR role' })
  @ApiNotFoundResponse({ description: 'Sprint config or student record not found' })
  async overrideStoryPoints(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Param('sprintId', new ParseUUIDPipe()) sprintId: string,
    @Body() dto: OverrideStoryPointsDto,
    @Request() req: RequestWithUser,
  ): Promise<StudentStoryPointRecordDto> {
    const requestedBy = req.user.userId ?? req.user.sub ?? 'unknown';
    return this.storyPointsService.override(groupId, sprintId, dto, requestedBy);
  }
}
