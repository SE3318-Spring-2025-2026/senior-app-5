import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { DeliverInviteDto } from './dto/deliver-invite.dto';

@Controller('invites')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('deliver')
  @HttpCode(HttpStatus.CREATED)
  async deliverInvite(@Body() deliverInviteDto: DeliverInviteDto) {
    return this.notificationsService.deliverInvite(deliverInviteDto);
  }
}
