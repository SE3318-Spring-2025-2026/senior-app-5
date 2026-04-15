import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { TransferAdvisorRequest } from './dto/transfer-advisor.dto';
import { GroupStatus } from './group.entity';

describe('GroupsController', () => {
  let controller: GroupsController;
  let service: GroupsService;

  beforeEach(async () => {
    const mockService = {
      createGroup: jest.fn(),
      transferAdvisor: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupsController],
      providers: [
        {
          provide: GroupsService,
          useValue: mockService,
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

  describe('transferAdvisor', () => {
    const groupId = 'test-group-id';
    const currentAdvisorId = 'old-advisor-id';
    const newAdvisorId = 'new-advisor-id';
    const coordinatorId = 'coordinator-id';

    const transferRequest: TransferAdvisorRequest = {
      currentAdvisorId,
      newAdvisorId,
    };

    const mockRequest = {
      user: { id: coordinatorId },
    };

    const expectedResult = {
      groupId,
      status: 'ASSIGNED',
      advisorId: newAdvisorId,
      advisorName: 'newadvisor@example.com',
      canSubmitRequest: true,
      blockedReason: null,
      updatedAt: new Date(),
    };

    it('should successfully transfer advisor with valid COORDINATOR token', async () => {
      jest.spyOn(service, 'transferAdvisor').mockResolvedValue(expectedResult);

      const result = await controller.transferAdvisor(groupId, transferRequest, mockRequest);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.transferAdvisor).toHaveBeenCalledWith(
        groupId,
        currentAdvisorId,
        newAdvisorId,
        coordinatorId,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should reject transfer if same currentAdvisorId and newAdvisorId', async () => {
      const sameAdvisorRequest: TransferAdvisorRequest = {
        currentAdvisorId,
        newAdvisorId: currentAdvisorId,
      };

      jest
        .spyOn(service, 'transferAdvisor')
        .mockRejectedValue(new BadRequestException('New advisor must be different from current advisor'));

      await expect(
        controller.transferAdvisor(groupId, sameAdvisorRequest, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return 404 if group not found', async () => {
      jest
        .spyOn(service, 'transferAdvisor')
        .mockRejectedValue(new NotFoundException(`Group ${groupId} not found`));

      await expect(
        controller.transferAdvisor(groupId, transferRequest, mockRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return 404 if currentAdvisorId not assigned to group', async () => {
      jest
        .spyOn(service, 'transferAdvisor')
        .mockRejectedValue(
          new NotFoundException(
            `Current advisor ${currentAdvisorId} is not assigned to group ${groupId}`,
          ),
        );

      await expect(
        controller.transferAdvisor(groupId, transferRequest, mockRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return 404 if new advisor not found', async () => {
      jest
        .spyOn(service, 'transferAdvisor')
        .mockRejectedValue(new NotFoundException(`Advisor ${newAdvisorId} not found`));

      await expect(
        controller.transferAdvisor(groupId, transferRequest, mockRequest),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
