import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { GroupsService } from './groups.service';
import { Group, GroupStatus } from './group.entity';
import { Submission } from '../submissions/schemas/submission.schema';
import { User } from '../users/data/user.schema';

describe('GroupsService', () => {
  let service: GroupsService;
  let mockGroupModel: any;
  let mockSubmissionModel: any;
  let mockUserModel: any;

  beforeEach(async () => {
    const mockGroup = {
      groupId: 'test-uuid',
      groupName: 'Test Group',
      leaderUserId: '123e4567-e89b-12d3-a456-426614174000',
      status: GroupStatus.ACTIVE,
      members: [],
      memberCount: 0,
      save: jest.fn().mockResolvedValue({
        groupId: 'test-uuid',
        groupName: 'Test Group',
        leaderUserId: '123e4567-e89b-12d3-a456-426614174000',
        status: GroupStatus.ACTIVE,
        members: [],
        memberCount: 0,
      }),
    };

    mockGroupModel = jest.fn().mockImplementation(() => mockGroup);
    mockGroupModel.findOne = jest.fn();
    mockGroupModel.findOneAndUpdate = jest.fn();

    mockSubmissionModel = {
      find: jest.fn(),
    };

    mockUserModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
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
          provide: getModelToken(User.name),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          useValue: mockUserModel,
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

  it('should add a member, update memberCount, and set user teamId', async () => {
    const groupId = 'group-1';
    const memberUserId = '507f1f77bcf86cd799439011';
    const updatedGroup = {
      groupId,
      groupName: 'Test Group',
      leaderUserId: '123e4567-e89b-12d3-a456-426614174000',
      members: [memberUserId],
      memberCount: 1,
      status: GroupStatus.ACTIVE,
    };
    const mockUser = { _id: memberUserId, email: 'user@example.com' };

    mockUserModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockUser) });
    mockGroupModel.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(updatedGroup) });
    mockUserModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue({ ...mockUser, teamId: groupId }) });

    const result = await service.addMemberToGroup(groupId, memberUserId);

    expect(mockUserModel.findById).toHaveBeenCalledWith(memberUserId);
    expect(mockGroupModel.findOneAndUpdate).toHaveBeenCalledWith(
      { groupId },
      [
        {
          $set: {
            members: {
              $setUnion: [{ $ifNull: ['$members', []] }, [memberUserId]],
            },
          },
        },
        {
          $set: {
            memberCount: { $size: '$members' },
          },
        },
      ],
      { new: true },
    );
    expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
      memberUserId,
      { teamId: groupId },
      { new: true },
    );
    expect(result.members).toContain(memberUserId);
    expect(result.memberCount).toBe(1);
  });

  it('should throw NotFoundException when user does not exist', async () => {
    mockUserModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(
      service.addMemberToGroup('group-1', '507f1f77bcf86cd799439011'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should throw NotFoundException when group does not exist', async () => {
    const mockUser = { _id: '507f1f77bcf86cd799439011', email: 'user@example.com' };
    mockUserModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockUser) });
    mockGroupModel.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(
      service.addMemberToGroup('missing-group', '507f1f77bcf86cd799439011'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
