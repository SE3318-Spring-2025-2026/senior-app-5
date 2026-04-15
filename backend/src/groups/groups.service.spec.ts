import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { GroupsService } from './groups.service';
import { Group, GroupStatus } from './group.entity';
import { Submission } from '../submissions/schemas/submission.schema';
import { CommitteeGroupAssignment } from './schemas/committee-group-assignment.schema';
import { AdvisorRequest, AdvisorRequestStatus } from './schemas/advisor-request.schema';
import { User } from '../users/data/user.schema';
import { NotFoundException } from '@nestjs/common';

describe('GroupsService', () => {
  let service: GroupsService;
  let mockGroupModel: any;
  let mockCommitteeGroupAssignmentModel: any;
  let mockAdvisorRequestModel: any;
  let mockUserModel: any;

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
    mockGroupModel.findOne = jest.fn();

    mockCommitteeGroupAssignmentModel = {
      findOneAndDelete: jest.fn(),
    };
    mockAdvisorRequestModel = {
      deleteMany: jest.fn(),
    };
    mockUserModel = {
      updateMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        {
          provide: getModelToken(Submission.name),
          useValue: { find: jest.fn() },
        },
        {
          provide: getModelToken(Group.name),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          useValue: mockGroupModel,
        },
        {
          provide: getModelToken(CommitteeGroupAssignment.name),
          useValue: mockCommitteeGroupAssignmentModel,
        },
        {
          provide: getModelToken(AdvisorRequest.name),
          useValue: mockAdvisorRequestModel,
        },
        {
          provide: getModelToken(User.name),
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

  it('should throw NotFound when assignment is missing', async () => {
    mockCommitteeGroupAssignmentModel.findOneAndDelete.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.removeGroupFromCommittee('committee-1', 'group-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should disband group when status is UNASSIGNED', async () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);
    mockGroupModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        groupId: 'group-1',
        status: GroupStatus.UNASSIGNED,
        save: mockSave,
      }),
    });
    mockUserModel.updateMany.mockReturnValue({ exec: jest.fn() });
    mockAdvisorRequestModel.deleteMany.mockReturnValue({ exec: jest.fn() });

    await service.disbandGroup('group-1');

    expect(mockUserModel.updateMany).toHaveBeenCalledWith(
      { teamId: 'group-1' },
      { $set: { teamId: null } },
    );
    expect(mockAdvisorRequestModel.deleteMany).toHaveBeenCalledWith({
      groupId: 'group-1',
      status: AdvisorRequestStatus.PENDING,
    });
    expect(mockSave).toHaveBeenCalled();
  });
});
