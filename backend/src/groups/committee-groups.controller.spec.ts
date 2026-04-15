import { Test, TestingModule } from '@nestjs/testing';
import { CommitteeGroupsController } from './committee-groups.controller';
import { GroupsService } from './groups.service';

describe('CommitteeGroupsController', () => {
  let controller: CommitteeGroupsController;
  let service: GroupsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommitteeGroupsController],
      providers: [
        {
          provide: GroupsService,
          useValue: {
            removeGroupFromCommittee: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CommitteeGroupsController>(CommitteeGroupsController);
    service = module.get<GroupsService>(GroupsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should remove group from committee using delete body groupId', async () => {
    await controller.removeGroupFromCommittee('committee-1', { groupId: 'group-1' });

    expect(service.removeGroupFromCommittee).toHaveBeenCalledWith('committee-1', 'group-1');
  });
});
