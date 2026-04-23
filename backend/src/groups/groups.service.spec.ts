import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { Group, GroupStatus } from './group.entity';
import { NotificationService } from '../notifications/notification.service';
import { UsersService } from '../users/users.service';
import { Submission } from '../submissions/schemas/submission.schema';

describe('GroupsService', () => {
  let service: GroupsService;
  let mockGroupModel: any;
  let mockSubmissionModel: any;
  let mockNotificationService: any;
  let mockUsersService: any;

  beforeEach(async () => {
    const mockGroup = {
      groupId: 'test-uuid',
      groupName: 'Test Group',
      leaderUserId: '123e4567-e89b-12d3-a456-426614174000',
      status: GroupStatus.ACTIVE,
      save: jest.fn().mockResolvedValue({
        groupId: 'test-uuid',
        groupName: 'Test Group',
        leaderUserId: '123e4567-e89b-12d3-a456-426614174000',
        status: GroupStatus.ACTIVE,
      }),
    };

    mockGroupModel = jest.fn().mockImplementation(() => mockGroup);

    // Add findOne method to mock model
    mockGroupModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockGroup),
    });

    // Add findOneAndUpdate method to mock model
    mockGroupModel.findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...mockGroup,
        advisorId: 'new-advisor-id',
      }),
    });

    mockSubmissionModel = jest.fn();
    mockSubmissionModel.find = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    });

    mockNotificationService = {
      sendAdvisorRemovalNotification: jest.fn().mockResolvedValue(undefined),
      sendAdvisorAssignmentNotification: jest.fn().mockResolvedValue(undefined),
      getAllNotifications: jest.fn().mockReturnValue([]),
      clearNotifications: jest.fn(),
    };

    mockUsersService = {
      findById: jest.fn().mockResolvedValue({
        _id: 'new-advisor-id',
        email: 'advisor@example.com',
        role: 'Coordinator',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        {
          provide: getModelToken(Group.name),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          useValue: mockGroupModel,
        },
        {
          provide: getModelToken(Submission.name),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          useValue: mockSubmissionModel,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a group', async () => {
    const createGroupDto = {
      groupName: 'Test Group',
      leaderUserId: '123e4567-e89b-12d3-a456-426614174000',
    };

    const result = await service.createGroup(createGroupDto);

    expect(result).toBeDefined();
    expect(result.groupName).toBe('Test Group');
    expect(result.leaderUserId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(result.status).toBe(GroupStatus.ACTIVE);
    expect(result.groupId).toBeDefined();
  });

  describe('transferAdvisor', () => {
    const groupId = 'test-group-uuid';
    const currentAdvisorId = 'old-advisor-id';
    const newAdvisorId = 'new-advisor-id';
    const coordinatorId = 'coordinator-id';

    const mockGroup = {
      groupId,
      groupName: 'Test Group',
      leaderUserId: 'leader-id',
      status: GroupStatus.ACTIVE,
      advisorId: currentAdvisorId,
    };

    const mockNewAdvisor = {
      _id: newAdvisorId,
      email: 'newadvisor@example.com',
      role: 'Coordinator',
    };

    it('should successfully transfer advisor', async () => {
      mockGroupModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockGroup),
      });

      mockGroupModel.findOneAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockGroup,
          advisorId: newAdvisorId,
        }),
      });

      mockUsersService.findById.mockResolvedValue(mockNewAdvisor);
      mockNotificationService.sendAdvisorRemovalNotification.mockResolvedValue(
        undefined,
      );
      mockNotificationService.sendAdvisorAssignmentNotification.mockResolvedValue(
        undefined,
      );

      const result = await service.transferAdvisor(
        groupId,
        currentAdvisorId,
        newAdvisorId,
        coordinatorId,
      );

      expect(result).toBeDefined();
      expect(result.groupId).toBe(groupId);
      expect(result.status).toBe('ASSIGNED');
      expect(result.advisorId).toBe(newAdvisorId);
      expect(result.advisorName).toBe(mockNewAdvisor.email);
      expect(mockGroupModel.findOneAndUpdate).toHaveBeenCalledWith(
        { groupId },
        { advisorId: newAdvisorId, advisorName: mockNewAdvisor.email },
        { new: true },
      );
      expect(
        mockNotificationService.sendAdvisorRemovalNotification,
      ).toHaveBeenCalledWith(currentAdvisorId, groupId, mockGroup.groupName);
      expect(
        mockNotificationService.sendAdvisorAssignmentNotification,
      ).toHaveBeenCalledWith(newAdvisorId, groupId, mockGroup.groupName);
    });

    it('should reject transfer if newAdvisorId equals currentAdvisorId', async () => {
      await expect(
        service.transferAdvisor(
          groupId,
          currentAdvisorId,
          currentAdvisorId,
          coordinatorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if group not found', async () => {
      mockGroupModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.transferAdvisor(
          groupId,
          currentAdvisorId,
          newAdvisorId,
          coordinatorId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if currentAdvisorId does not match existing advisor', async () => {
      const groupWithDifferentAdvisor = {
        ...mockGroup,
        advisorId: 'different-advisor-id',
      };

      mockGroupModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(groupWithDifferentAdvisor),
      });

      await expect(
        service.transferAdvisor(
          groupId,
          currentAdvisorId,
          newAdvisorId,
          coordinatorId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if new advisor does not exist', async () => {
      mockGroupModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockGroup),
      });

      mockUsersService.findById.mockResolvedValue(null);

      await expect(
        service.transferAdvisor(
          groupId,
          currentAdvisorId,
          newAdvisorId,
          coordinatorId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if findOneAndUpdate fails', async () => {
      // Reset mocks for this test
      const exec = jest.fn().mockResolvedValue(null);
      mockGroupModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockGroup),
      });

      mockGroupModel.findOneAndUpdate = jest.fn().mockReturnValue({ exec });

      mockUsersService.findById.mockResolvedValue(mockNewAdvisor);

      await expect(
        service.transferAdvisor(
          groupId,
          currentAdvisorId,
          newAdvisorId,
          coordinatorId,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(mockGroupModel.findOneAndUpdate).toHaveBeenCalled();
    });
  });
});
