import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './schemas/notification.schema';
import { DeliverInviteDto } from './dto/deliver-invite.dto';

interface AdvisorRequestNotificationInput {
  recipientUserId: string;
  groupId: string;
}

interface AdvisorRequestDecisionNotificationInput {
  recipientUserId: string;
  groupId: string;
  requestId: string;
}

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

  async notifyAdvisorRequestSubmitted(input: AdvisorRequestNotificationInput) {
    const notification = new this.notificationModel({
      recipientUserId: input.recipientUserId,
      groupId: input.groupId,
      type: 'AdvisorRequestSubmitted',
    });

    const savedNotification = await notification.save();
    return { notificationId: savedNotification._id.toString() };
  }

  async notifyAdvisorRequestApproved(
    input: AdvisorRequestDecisionNotificationInput,
  ) {
    const notification = new this.notificationModel({
      recipientUserId: input.recipientUserId,
      groupId: input.groupId,
      type: 'AdvisorRequestApproved',
      requestId: input.requestId,
    });

    const savedNotification = await notification.save();
    return { notificationId: savedNotification._id.toString() };
  }

  async notifyAdvisorRequestRejected(
    input: AdvisorRequestDecisionNotificationInput,
  ) {
    const notification = new this.notificationModel({
      recipientUserId: input.recipientUserId,
      groupId: input.groupId,
      type: 'AdvisorRequestRejected',
      requestId: input.requestId,
    });

    const savedNotification = await notification.save();
    return { notificationId: savedNotification._id.toString() };
  }

  async notifyAdvisorRequestWithdrawn(
    input: AdvisorRequestDecisionNotificationInput,
  ) {
    const notification = new this.notificationModel({
      recipientUserId: input.recipientUserId,
      groupId: input.groupId,
      type: 'AdvisorRequestWithdrawn',
      requestId: input.requestId,
    });

    const savedNotification = await notification.save();
    return { notificationId: savedNotification._id.toString() };
  }

  async notifySprintScheduled(input: {
    recipientUserId: string;
    sprintId: string;
    sprintName: string;
    startDate: Date;
    endDate: Date;
  }) {
    const notification = new this.notificationModel({
      recipientUserId: input.recipientUserId,
      type: 'SprintScheduled',
      data: {
        sprintId: input.sprintId,
        sprintName: input.sprintName,
        startDate: input.startDate.toISOString(),
        endDate: input.endDate.toISOString(),
        message: `Sprint ${input.sprintName} starts on ${input.startDate.toISOString().slice(0, 10)} and ends on ${input.endDate.toISOString().slice(0, 10)}. Please make sure you have an active sprint open in your JIRA covering this date range.`,
      },
    });
    const saved = await notification.save();
    return { notificationId: saved._id.toString() };
  }

  async notifyAdvisorReleased(input: AdvisorRequestNotificationInput) {
    const notification = new this.notificationModel({
      recipientUserId: input.recipientUserId,
      groupId: input.groupId,
      type: 'AdvisorReleased',
    });

    const savedNotification = await notification.save();
    return { notificationId: savedNotification._id.toString() };
  }
}
