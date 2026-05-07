import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupAssignmentStatus, GroupStatus } from './group.entity';
import { CommitteesService } from '../committees/committees.service';
import { Role } from '../auth/enums/role.enum';
import { CommitteeGradeStatus } from './dto/committee-grade-result.dto';
import { EvaluationGrade } from './schemas/committee-evaluation.schema';
import { SubmissionsService } from '../submissions/submissions.service';

describe('GroupsController', () => {
  let controller: GroupsController;
  let service: GroupsService;
  let mockSubmissionsService: any;

  const mockRequest = (role: string = Role.Coordinator) => ({
    user: { userId: 'user-uuid', role },
    headers: {},
  } as any);

  beforeEach(async () => {
    const mockService = {
      createGroup: jest.fn(),
      getCommitteeGrade: jest.fn(),
    };

    const mockCommitteesService = {
      getCommitteeByGroupId: jest.fn(),
    };

  
    mockSubmissionsService = {
      validateSowEligibility: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupsController],
      providers: [
        { provide: GroupsService, useValue: mockService },
        { provide: CommitteesService, useValue: mockCommitteesService },
        { provide: SubmissionsService, useValue: mockSubmissionsService },
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
        expect.arrayContaining([Role.Student, Role.TeamLeader, Role.Professor, Role.Coordinator, Role.Admin]),
      );
    });

    it('should allow all authenticated users to get committee by Group ID', () => {
      const roles = Reflect.getMetadata('roles', controller.getCommitteeByGroupId);
      expect(roles).toEqual(
        expect.arrayContaining([Role.Student, Role.TeamLeader, Role.Professor, Role.Coordinator, Role.Admin]),
      );
    });

    it('should restrict getCommitteeGrade to Coordinator, Professor, Admin', () => {
      const roles = Reflect.getMetadata('roles', controller.getCommitteeGrade);
      expect(roles).toEqual(
        expect.arrayContaining([Role.Coordinator, Role.Professor, Role.Admin]),
      );
      expect(roles).not.toContain(Role.Student);
      expect(roles).not.toContain(Role.TeamLeader);
    });
  });

  describe('getCommitteeGrade', () => {
    const groupId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const deliverableId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    const mockGradeResult = {
      groupId,
      deliverableId,
      submissionId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      committeeGradeList: [
        { memberId: 'member-0', grade: EvaluationGrade.A },
        { memberId: 'member-1', grade: EvaluationGrade.B },
      ],
      averageGrade: 3.5,
      status: CommitteeGradeStatus.GRADED,
    };

    it('returns 200 with CommitteeGradeResult shape on success', async () => {
      jest.spyOn(service, 'getCommitteeGrade').mockResolvedValue(mockGradeResult);

      const result = await controller.getCommitteeGrade(groupId, deliverableId, mockRequest());

      expect(result).toEqual(mockGradeResult);
      expect(service.getCommitteeGrade).toHaveBeenCalledWith(groupId, deliverableId, undefined);
    });

    it('propagates NotFoundException as 404 when no records exist', async () => {
      jest.spyOn(service, 'getCommitteeGrade').mockRejectedValue(
        new NotFoundException('No committee evaluation records found'),
      );

      await expect(
        controller.getCommitteeGrade(groupId, deliverableId, mockRequest()),
      ).rejects.toThrow(NotFoundException);
    });

    it('propagates UnauthorizedException as 401', async () => {
      jest.spyOn(service, 'getCommitteeGrade').mockRejectedValue(new UnauthorizedException());

      await expect(
        controller.getCommitteeGrade(groupId, deliverableId, mockRequest()),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('propagates ForbiddenException as 403', async () => {
      jest.spyOn(service, 'getCommitteeGrade').mockRejectedValue(new ForbiddenException());

      await expect(
        controller.getCommitteeGrade(groupId, deliverableId, mockRequest()),
      ).rejects.toThrow(ForbiddenException);
    });

    it('passes x-correlation-id header to service', async () => {
      jest.spyOn(service, 'getCommitteeGrade').mockResolvedValue(mockGradeResult);
      const reqWithCorrelation = {
        user: { userId: 'user-uuid', role: Role.Coordinator },
        headers: { 'x-correlation-id': 'corr-123' },
      } as any;

      await controller.getCommitteeGrade(groupId, deliverableId, reqWithCorrelation);

      expect(service.getCommitteeGrade).toHaveBeenCalledWith(groupId, deliverableId, 'corr-123');
    });
  });

  describe('validateSow (Process 6.6)', () => {
    it('should return SOW eligibility when Student queries their own group', async () => {
      // Kendi grubu 'group-A' olan bir öğrenci isteği
      const req = { user: { role: Role.Student, groupId: 'group-A' } };
      const expectedResult = { sowStatus: 'NOT_SUBMITTED', revisedProposalStatus: 'MISSING', canProceed: false };
      
      // Servisin döneceği cevabı mockluyoruz
      mockSubmissionsService.validateSowEligibility.mockResolvedValue(expectedResult);

      const result = await controller.validateSow('group-A', req as any);
      
      expect(result).toEqual(expectedResult);
      expect(mockSubmissionsService.validateSowEligibility).toHaveBeenCalledWith('group-A');
    });

    it('should throw ForbiddenException if Student tries to validate another group (Cross-Group Snooping)', async () => {
      const req = { user: { role: Role.Student, groupId: 'group-A' } };
      await expect(controller.validateSow('group-B', req as any)).rejects.toThrow(ForbiddenException);
      expect(mockSubmissionsService.validateSowEligibility).not.toHaveBeenCalled();
    });

    it('should allow Coordinator to validate any group', async () => {
      const req = { user: { role: Role.Coordinator } }; 
      const expectedResult = { sowStatus: 'NOT_SUBMITTED', revisedProposalStatus: 'APPROVED', canProceed: true };
      mockSubmissionsService.validateSowEligibility.mockResolvedValue(expectedResult);
      const result = await controller.validateSow('group-C', req as any);
      expect(result).toEqual(expectedResult);
      expect(mockSubmissionsService.validateSowEligibility).toHaveBeenCalledWith('group-C');
    });
  }); 
});