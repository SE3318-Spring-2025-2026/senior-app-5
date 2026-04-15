import { Test, TestingModule } from '@nestjs/testing';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupStatus } from './group.entity';
import { CommitteesService } from '../committees/committees.service';

describe('GroupsController', () => {
  let controller: GroupsController;
  let service: GroupsService;

  beforeEach(async () => {
    const mockService = {
      createGroup: jest.fn(),
    };

    const mockCommitteesService = {
      getCommitteeByGroupId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupsController],
      providers: [
        {
          provide: GroupsService,
          useValue: mockService,
        },
        {
          provide: CommitteesService,
          useValue: mockCommitteesService,
        },
      ],
    }).compile();

    controller = module.get<GroupsController>(GroupsController);
    service = module.get<GroupsService>(GroupsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a group', async () => {
    const createGroupDto: CreateGroupDto = {
      groupName: 'Test Group',
      leaderUserId: '123e4567-e89b-12d3-a456-426614174000',
    };

    const expectedResult = {
      groupId: 'generated-uuid',
      groupName: 'Test Group',
      leaderUserId: '123e4567-e89b-12d3-a456-426614174000',
      status: GroupStatus.ACTIVE,
    };

    jest.spyOn(service, 'createGroup').mockResolvedValue(expectedResult);

    const result = await controller.createGroup(createGroupDto);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.createGroup).toHaveBeenCalledWith(createGroupDto);
    expect(result).toEqual(expectedResult);
  });
});
