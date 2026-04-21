import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { DeliverInviteDto } from './dto/deliver-invite.dto';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Invites')
@Controller('invites')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: 'Deliver an invite to a recipient' })
  @ApiCreatedResponse({ description: 'Invite delivered successfully' })
  @Post('deliver')
  @HttpCode(HttpStatus.CREATED)
  async deliverInvite(@Body() deliverInviteDto: DeliverInviteDto) {
    return this.notificationsService.deliverInvite(deliverInviteDto);
  }
}
