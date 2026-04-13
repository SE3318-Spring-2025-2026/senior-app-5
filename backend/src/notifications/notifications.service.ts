import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './schemas/notification.schema';
import { DeliverInviteDto } from './dto/deliver-invite.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
  ) {}

  async deliverInvite(deliverInviteDto: DeliverInviteDto) {
    const notification = new this.notificationModel({
      recipientUserId: deliverInviteDto.recipientUserId,
      groupId: deliverInviteDto.groupId,
      type: 'GroupInvite',
    });
    const savedNotification = await notification.save();
    return { notificationId: savedNotification._id.toString() };
  }
}
