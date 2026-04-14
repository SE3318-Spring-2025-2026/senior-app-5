import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { CoordinatorGuard } from '../auth/guards/coordinator.guard';
import { CommitteesService } from './committees.service';
import { CreateCommitteeDto } from './dto/create-committee.dto';
import { CommitteeResponseDto } from './dto/committee-response.dto';

interface RequestWithUser extends ExpressRequest {
  user: { userId?: string; sub?: string; _id?: string; role: string };
}

@ApiTags('Committees')
@Controller('committees')
export class CommitteesController {
  constructor(private readonly committeesService: CommitteesService) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({ operationId: 'createCommittee', summary: 'Create a new committee (COORDINATOR only)' })
  @ApiCreatedResponse({ description: 'Committee created successfully', type: CommitteeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Valid token but insufficient permissions' })
  @UseGuards(AuthGuard('jwt'), CoordinatorGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCommittee(
    @Body() dto: CreateCommitteeDto,
    @Request() req: RequestWithUser,
  ): Promise<CommitteeResponseDto> {
    const coordinatorId =
      req.user.userId ?? req.user.sub ?? req.user._id ?? 'unknown';
    const correlationId = (req.headers['x-correlation-id'] as string) ?? undefined;

    const committee = await this.committeesService.createCommittee(
      dto,
      coordinatorId,
      correlationId,
    );

    return {
      id: committee.id as string,
      name: committee.name,
      createdAt: (committee as any).createdAt as Date,
      updatedAt: (committee as any).updatedAt as Date | null,
      jury: [],
      advisors: [],
      groups: [],
    };
  }
}
