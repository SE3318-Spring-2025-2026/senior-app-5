import {
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
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
} from '@nestjs/swagger';
import { Request } from 'express';
import { CommitteesService } from './committees.service';
import { JuryMemberPageDto } from './dto/jury-member-page.dto';
import { ListJuryMembersQueryDto } from './dto/list-jury-members-query.dto';
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
}