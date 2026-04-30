import { Test, TestingModule } from '@nestjs/testing';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupAssignmentStatus, GroupStatus } from './group.entity';
import { CommitteesService } from '../committees/committees.service';
import { Role } from '../auth/enums/role.enum'; 

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
      assignmentStatus: GroupAssignmentStatus.UNASSIGNED,
      assignedAdvisorId: null,
    };

    jest.spyOn(service, 'createGroup').mockResolvedValue(expectedResult as any);

    const result = await controller.createGroup(createGroupDto);

    
    expect(service.createGroup).toHaveBeenCalledWith(createGroupDto);
    expect(result).toEqual(expectedResult);
  });

  
  describe('RBAC Matrix Validation', () => {
    it('should restrict createGroup to Admin and Coordinator', () => {
      const roles = Reflect.getMetadata('roles', controller.createGroup);
      expect(roles).toEqual([Role.Admin, Role.Coordinator]);
    });

    it('should restrict addMember to Admin and Coordinator', () => {
      const roles = Reflect.getMetadata('roles', controller.addMember);
      expect(roles).toEqual([Role.Admin, Role.Coordinator]);
    });

    it('should allow all authenticated users to validate SoW', () => {
      const roles = Reflect.getMetadata('roles', controller.validateSow);
      expect(roles).toEqual(
        expect.arrayContaining([Role.Student, Role.TeamLeader, Role.Professor, Role.Coordinator, Role.Admin])
      );
    });

    it('should allow all authenticated users to get committee by Group ID', () => {
      const roles = Reflect.getMetadata('roles', controller.getCommitteeByGroupId);
      expect(roles).toEqual(
        expect.arrayContaining([Role.Student, Role.TeamLeader, Role.Professor, Role.Coordinator, Role.Admin])
      );
    });
  });
});