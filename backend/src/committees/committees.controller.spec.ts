import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommitteesController } from './committees.controller';
import { CommitteesService } from './committees.service';
import { AddCommitteeAdvisorRequest } from './dto/add-committee-advisor-request.dto';

describe('CommitteesController', () => {
  let controller: CommitteesController;
  let service: CommitteesService;

  beforeEach(async () => {
    const mockService = {
      listJuryMembers: jest.fn(),
      addAdvisor: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommitteesController],
      providers: [
        {
          provide: CommitteesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CommitteesController>(CommitteesController);
    service = module.get<CommitteesService>(CommitteesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('addCommitteeAdvisor', () => {
    const committeeId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    const advisorUserId = 'advisor-user-id-1234';
    const coordinatorId = 'coordinator-user-id-5678';

    const addAdvisorRequest: AddCommitteeAdvisorRequest = {
      advisorUserId,
      assignedAt: '2026-04-17T10:30:00.000Z',
    };

    const mockRequest = {
      user: { userId: coordinatorId },
    } as any;

    const expectedResponse = {
      advisorUserId,
      assignedAt: new Date('2026-04-17T10:30:00.000Z'),
      assignedByUserId: coordinatorId,
    };

    it('should successfully link advisor to committee with valid COORDINATOR token', async () => {
      jest.spyOn(service, 'addAdvisor').mockResolvedValue(expectedResponse);

      const result = await controller.addCommitteeAdvisor(
        committeeId,
        addAdvisorRequest,
        mockRequest,
        'corr-1',
      );

      expect(service.addAdvisor).toHaveBeenCalledWith(
        committeeId,
        advisorUserId,
        new Date('2026-04-17T10:30:00.000Z'),
        coordinatorId,
        'corr-1',
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should use server time when assignedAt not provided', async () => {
      const addAdvisorRequestNoDate: AddCommitteeAdvisorRequest = {
        advisorUserId,
      };

      const expectedResponseWithServerTime = {
        advisorUserId,
        assignedAt: new Date(),
        assignedByUserId: coordinatorId,
      };

      jest
        .spyOn(service, 'addAdvisor')
        .mockResolvedValue(expectedResponseWithServerTime);

      const result = await controller.addCommitteeAdvisor(
        committeeId,
        addAdvisorRequestNoDate,
        mockRequest,
      );

      // Check that undefined is passed to service when no assignedAt
      expect(service.addAdvisor).toHaveBeenCalledWith(
        committeeId,
        advisorUserId,
        undefined,
        coordinatorId,
        undefined,
      );
      expect(result.assignedByUserId).toEqual(coordinatorId);
    });

    it('should reject with 409 when advisor already linked', async () => {
      jest
        .spyOn(service, 'addAdvisor')
        .mockRejectedValue(
          new ConflictException(
            `Advisor ${advisorUserId} is already linked to committee ${committeeId}`,
          ),
        );

      await expect(
        controller.addCommitteeAdvisor(
          committeeId,
          addAdvisorRequest,
          mockRequest,
        ),
      ).rejects.toThrow(ConflictException);

      expect(service.addAdvisor).toHaveBeenCalledWith(
        committeeId,
        advisorUserId,
        new Date('2026-04-17T10:30:00.000Z'),
        coordinatorId,
        undefined,
      );
    });

    it('should reject with 404 when committee not found', async () => {
      jest
        .spyOn(service, 'addAdvisor')
        .mockRejectedValue(
          new NotFoundException(`Committee ${committeeId} not found`),
        );

      await expect(
        controller.addCommitteeAdvisor(
          committeeId,
          addAdvisorRequest,
          mockRequest,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject with 404 when advisor not found', async () => {
      jest
        .spyOn(service, 'addAdvisor')
        .mockRejectedValue(
          new NotFoundException(
            `Advisor ${advisorUserId} not found or does not have advisor role`,
          ),
        );

      await expect(
        controller.addCommitteeAdvisor(
          committeeId,
          addAdvisorRequest,
          mockRequest,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should extract coordinatorId from request.user.userId', async () => {
      jest.spyOn(service, 'addAdvisor').mockResolvedValue(expectedResponse);

      const customMockRequest = {
        user: { userId: 'custom-coordinator-id' },
      } as any;

      await controller.addCommitteeAdvisor(
        committeeId,
        addAdvisorRequest,
        customMockRequest,
      );

      expect(service.addAdvisor).toHaveBeenCalledWith(
        committeeId,
        advisorUserId,
        new Date('2026-04-17T10:30:00.000Z'),
        'custom-coordinator-id',
        undefined,
      );
    });

    it('should handle correlation ID when provided', async () => {
      jest.spyOn(service, 'addAdvisor').mockResolvedValue(expectedResponse);

      await controller.addCommitteeAdvisor(
        committeeId,
        addAdvisorRequest,
        mockRequest,
        'custom-correlation-id',
      );

      expect(service.addAdvisor).toHaveBeenCalledWith(
        committeeId,
        advisorUserId,
        new Date('2026-04-17T10:30:00.000Z'),
        coordinatorId,
        'custom-correlation-id',
      );
    });
  });
});
