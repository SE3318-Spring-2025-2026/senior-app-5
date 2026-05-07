import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { AdvisorsService } from './advisors.service';
import { TransferAdvisorDto } from './dto/transfer-advisor.dto';

interface RequestWithUser extends Request {
  user?: { userId?: string; role?: string };
}

@Controller('groups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GroupsAdvisorController {
  private readonly logger = new Logger(GroupsAdvisorController.name);

  constructor(private readonly advisorsService: AdvisorsService) {}

  private getCorrelationId(req: Request): string | undefined {
    const headerValue =
      req.headers?.['x-correlation-id'] ?? req.headers?.['x-request-id'];
    return typeof headerValue === 'string' ? headerValue : undefined;
  }

  @Get(':groupId/status')
  @Roles(
    Role.Admin,
    Role.Coordinator,
    Role.Professor,
    Role.TeamLeader,
    Role.Student,
  )
  async getGroupStatus(
    @Req() req: RequestWithUser,
    @Param('groupId', new ParseUUIDPipe({ version: '4' })) groupId: string,
  ) {
    const correlationId = this.getCorrelationId(req);

    const result = await this.advisorsService.getGroupStatus(groupId);

    this.logger.log(
      JSON.stringify({
        event: 'group_status_queried',
        groupId,
        callerRole: req.user?.role,
        correlationId,
      }),
    );

    return result;
  }

  @Patch(':groupId/advisor')
  @Roles(Role.Coordinator, Role.Admin)
  async transferAdvisor(
    @Req() req: RequestWithUser,
    @Param('groupId', new ParseUUIDPipe({ version: '4' })) groupId: string,
    @Body() body: TransferAdvisorDto,
  ) {
    const correlationId = this.getCorrelationId(req);

    const result = await this.advisorsService.transferAdvisor({
      groupId,
      currentAdvisorId: body.currentAdvisorId,
      newAdvisorId: body.newAdvisorId,
    });

    this.logger.log(
      JSON.stringify({
        event: 'advisor_transferred',
        groupId,
        callerRole: req.user?.role,
        correlationId,
      }),
    );

    return result;
  }

  @Delete(':groupId')
  @Roles(Role.Coordinator, Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  async disbandGroup(
    @Req() req: RequestWithUser,
    @Param('groupId', new ParseUUIDPipe({ version: '4' })) groupId: string,
  ) {
    const correlationId = this.getCorrelationId(req);

    await this.advisorsService.disbandGroup(groupId);

    this.logger.log(
      JSON.stringify({
        event: 'group_disbanded',
        groupId,
        callerRole: req.user?.role,
        correlationId,
      }),
    );
  }
}
