import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    service.clearNotifications();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendAdvisorRemovalNotification', () => {
    it('should create and store a removal notification', async () => {
      const advisorId = 'advisor-123';
      const groupId = 'group-456';
      const groupName = 'Test Group';

      await service.sendAdvisorRemovalNotification(
        advisorId,
        groupId,
        groupName,
      );

      const notifications = service.getAllNotifications();
      expect(notifications.length).toBe(1);
      expect(notifications[0].recipientId).toBe(advisorId);
      expect(notifications[0].type).toBe('ADVISOR_REMOVAL');
      expect(notifications[0].groupId).toBe(groupId);
      expect(notifications[0].groupName).toBe(groupName);
    });
  });

  describe('sendAdvisorAssignmentNotification', () => {
    it('should create and store an assignment notification', async () => {
      const advisorId = 'advisor-789';
      const groupId = 'group-101';
      const groupName = 'Another Test Group';

      await service.sendAdvisorAssignmentNotification(
        advisorId,
        groupId,
        groupName,
      );

      const notifications = service.getAllNotifications();
      expect(notifications.length).toBe(1);
      expect(notifications[0].recipientId).toBe(advisorId);
      expect(notifications[0].type).toBe('ADVISOR_ASSIGNMENT');
      expect(notifications[0].groupId).toBe(groupId);
      expect(notifications[0].groupName).toBe(groupName);
    });
  });

  describe('getAllNotifications', () => {
    it('should return all notifications', async () => {
      const advisorId1 = 'advisor-1';
      const advisorId2 = 'advisor-2';
      const groupId = 'group-1';
      const groupName = 'Test Group';

      await service.sendAdvisorRemovalNotification(
        advisorId1,
        groupId,
        groupName,
      );
      await service.sendAdvisorAssignmentNotification(
        advisorId2,
        groupId,
        groupName,
      );

      const notifications = service.getAllNotifications();
      expect(notifications.length).toBe(2);
      expect(notifications[0].type).toBe('ADVISOR_REMOVAL');
      expect(notifications[1].type).toBe('ADVISOR_ASSIGNMENT');
    });
  });

  describe('clearNotifications', () => {
    it('should clear all notifications', async () => {
      const advisorId = 'advisor-123';
      const groupId = 'group-456';
      const groupName = 'Test Group';

      await service.sendAdvisorRemovalNotification(
        advisorId,
        groupId,
        groupName,
      );
      expect(service.getAllNotifications().length).toBe(1);

      service.clearNotifications();
      expect(service.getAllNotifications().length).toBe(0);
    });
  });
});
