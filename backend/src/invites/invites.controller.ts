import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { InvitesService } from './invites.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import type { Request } from 'express';

type RequestWithUser = Request & {
  user?: {
    userId?: string;
    role?: string;
  };
};

@ApiTags('Invites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invites')
export class InvitesController {
  constructor(
    private readonly invitesService: InvitesService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  @Post('deliver')
  @Roles(Role.Coordinator, Role.Admin)
  @ApiOperation({ summary: 'Deliver invites to groups' })
  async deliverInvites(@Req() req: RequestWithUser) {
    const result = await this.invitesService.deliverInvites();
    await this.activityLogsService.create({
      eventType: 'INVITES_DELIVERED',
      summary: 'Invite delivery triggered',
      actorUserId: req.user?.userId,
      actorRole: req.user?.role,
      targetType: 'invites',
      targetId: 'delivery',
      metadata: {
        status: result.status,
      },
    });
    return result;
  }
}
