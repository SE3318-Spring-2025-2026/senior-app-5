import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { GroupsService } from './groups.service';
import { Group, GroupStatus } from './group.entity';
import { Submission } from '../submissions/schemas/submission.schema';

describe('GroupsService', () => {
  let service: GroupsService;
  let mockGroupModel: any;
  let mockSubmissionModel: any;

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

    mockSubmissionModel = {
      find: jest.fn(),
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

  it('should add a member and increment memberCount', async () => {
    const groupId = 'group-1';
    const memberUserId = 'user-1';
    const save = jest.fn().mockResolvedValue(undefined);
    const group = {
      groupId,
      members: [],
      memberCount: 0,
      save,
    };

    mockGroupModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(group) });

    const result = await service.addMemberToGroup(groupId, memberUserId);

    expect(result.members).toEqual([memberUserId]);
    expect(result.memberCount).toBe(1);
    expect(save).toHaveBeenCalled();
  });

  it('should throw NotFoundException when group does not exist', async () => {
    mockGroupModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.addMemberToGroup('missing-group', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
