import { Injectable, Logger } from '@nestjs/common';

export interface Notification {
  id: string;
  recipientId: string;
  type: 'ADVISOR_REMOVAL' | 'ADVISOR_ASSIGNMENT';
  groupId: string;
  groupName: string;
  data?: Record<string, any>;
  createdAt: Date;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private notifications: Notification[] = [];

  /**
   * Send notification to advisor about group removal
   */
  async sendAdvisorRemovalNotification(
    advisorId: string,
    groupId: string,
    groupName: string,
  ): Promise<void> {
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recipientId: advisorId,
      type: 'ADVISOR_REMOVAL',
      groupId,
      groupName,
      createdAt: new Date(),
    };

    this.notifications.push(notification);
    this.logger.log(
      `Advisor removal notification sent to advisor ${advisorId} ` +
        `for group ${groupName} (${groupId})`,
    );
  }

  /**
   * Send notification to advisor about group assignment
   */
  async sendAdvisorAssignmentNotification(
    advisorId: string,
    groupId: string,
    groupName: string,
  ): Promise<void> {
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recipientId: advisorId,
      type: 'ADVISOR_ASSIGNMENT',
      groupId,
      groupName,
      createdAt: new Date(),
    };

    this.notifications.push(notification);
    this.logger.log(
      `Advisor assignment notification sent to advisor ${advisorId} ` +
        `for group ${groupName} (${groupId})`,
    );
  }

  /**
   * Get all notifications for testing/debugging
   */
  getAllNotifications(): Notification[] {
    return [...this.notifications];
  }

  /**
   * Clear all notifications (for testing)
   */
  clearNotifications(): void {
    this.notifications = [];
  }
}
