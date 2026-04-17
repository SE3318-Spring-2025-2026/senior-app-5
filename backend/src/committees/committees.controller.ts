import {
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiCreatedResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CommitteesService } from './committees.service';
import { JuryMemberPageDto } from './dto/jury-member-page.dto';
import { ListJuryMembersQueryDto } from './dto/list-jury-members-query.dto';
import { AddCommitteeAdvisorRequest } from './dto/add-committee-advisor-request.dto';
import { CommitteeAdvisorResponse } from './dto/committee-advisor-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

interface JwtUser {
  userId: string;
  email: string;
  role: string;
}

interface RequestWithUser extends Request {
  user: JwtUser;
}

@ApiTags('Committees')
@Controller('committees')
export class CommitteesController {
  constructor(private readonly committeesService: CommitteesService) {}

  @Get(':committeeId/jury-members')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List jury members assigned to a committee',
  })
  @ApiOkResponse({
    description: 'Jury members returned successfully',
    type: JuryMemberPageDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid committeeId, page, or limit',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT',
  })
  @ApiForbiddenResponse({
    description: 'Valid token but insufficient permissions',
  })
  @ApiNotFoundResponse({
    description: 'Committee not found',
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Coordinator)
  async listJuryMembers(
    @Param('committeeId', new ParseUUIDPipe()) committeeId: string,
    @Query() query: ListJuryMembersQueryDto,
    @Req() req: RequestWithUser,
    @Headers('x-correlation-id') correlationId?: string,
  ): Promise<JuryMemberPageDto> {
    return this.committeesService.listJuryMembers(
      committeeId,
      query.page,
      query.limit,
      req.user.role,
      correlationId,
    );
  }

  @Post(':committeeId/advisors')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Link an advisor to a committee',
    operationId: 'addCommitteeAdvisor',
  })
  @ApiCreatedResponse({
    description: 'Advisor linked to committee successfully',
    type: CommitteeAdvisorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Malformed body or invalid payload',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT',
  })
  @ApiForbiddenResponse({
    description: 'Valid token but insufficient permissions',
  })
  @ApiNotFoundResponse({
    description: 'Committee or advisor not found',
  })
  @ApiConflictResponse({
    description: 'Advisor is already linked to this committee',
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Coordinator)
  @HttpCode(HttpStatus.CREATED)
  async addCommitteeAdvisor(
    @Param('committeeId', new ParseUUIDPipe()) committeeId: string,
    @Body() body: AddCommitteeAdvisorRequest,
    @Req() req: RequestWithUser,
    @Headers('x-correlation-id') correlationId?: string,
  ): Promise<CommitteeAdvisorResponse> {
    const coordinatorId = req.user.userId;
    const assignedAt = body.assignedAt ? new Date(body.assignedAt) : undefined;

    return this.committeesService.addAdvisor(
      committeeId,
      body.advisorUserId,
      assignedAt,
      coordinatorId,
      correlationId,
    );
  }
}