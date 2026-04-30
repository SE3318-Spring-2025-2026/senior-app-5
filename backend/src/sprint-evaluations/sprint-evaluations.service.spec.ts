import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../auth/enums/role.enum';
import { Group } from '../groups/group.entity';
import { Schedule } from '../advisors/schemas/schedule.schema';
import { SprintEvaluationsService } from './sprint-evaluations.service';
import {
  SprintEvaluation,
  SprintEvaluationStatus,
  SprintEvaluationType,
} from './schemas/sprint-evaluation.schema';

describe('SprintEvaluationsService', () => {
  let service: SprintEvaluationsService;

  const mockGroupModel = {
    findOne: jest.fn(),
  };

  const mockScheduleModel = {
    findOne: jest.fn(),
  };

  const mockSprintEvaluationModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SprintEvaluationsService,
        { provide: getModelToken(Group.name), useValue: mockGroupModel },
        { provide: getModelToken(Schedule.name), useValue: mockScheduleModel },
        {
          provide: getModelToken(SprintEvaluation.name),
          useValue: mockSprintEvaluationModel,
        },
      ],
    }).compile();

    service = module.get(SprintEvaluationsService);
  });

  describe('recordSprintEvaluation', () => {
    const dto = {
      groupId: '66666666-6666-4666-8666-666666666661',
      sprintId: '22222222-2222-4222-8222-222222222222',
      evaluationType: SprintEvaluationType.SCRUM,
      responses: [
        {
          questionId: '55555555-5555-4555-8555-555555555551',
          softGrade: 'A' as const,
        },
        {
          questionId: '55555555-5555-4555-8555-555555555552',
          softGrade: 'B' as const,
        },
      ],
    };

    const caller = {
      userId: 'advisor-1',
      role: Role.Professor,
    };

    function mockOpenWindow() {
      mockScheduleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ scheduleId: 'schedule-1' }),
      });
    }

    function mockOwnedGroup() {
      mockGroupModel.findOne.mockImplementation(
        (filter: Record<string, unknown>) => {
          if (filter.assignedAdvisorId) {
            return {
              exec: jest.fn().mockResolvedValue({
                groupId: dto.groupId,
                assignedAdvisorId: caller.userId,
                assignmentStatus: 'ASSIGNED',
              }),
            };
          }

          return {
            exec: jest.fn().mockResolvedValue({
              groupId: dto.groupId,
            }),
          };
        },
      );
    }

    it('records a sprint evaluation and calculates the weighted average', async () => {
      mockOpenWindow();
      mockOwnedGroup();
      mockSprintEvaluationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const mockDate = new Date('2023-01-01T10:00:00.000Z');

      mockSprintEvaluationModel.create.mockResolvedValue({
        evaluationId: 'evaluation-1',
        groupId: dto.groupId,
        sprintId: dto.sprintId,
        evaluationType: dto.evaluationType,
        rubricId: '44444444-4444-4444-8444-444444444441',
        responses: dto.responses,
        averageScore: 88,
        status: SprintEvaluationStatus.SUBMITTED,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      const result = await service.recordSprintEvaluation(dto as never, caller);

      expect(result).toEqual({
        evaluationId: 'evaluation-1',
        groupId: dto.groupId,
        sprintId: dto.sprintId,
        evaluationType: dto.evaluationType,
        rubricId: '44444444-4444-4444-8444-444444444441',
        responses: dto.responses,
        averageScore: 88,
        status: SprintEvaluationStatus.SUBMITTED,
        createdAt: mockDate.toISOString(),
        updatedAt: mockDate.toISOString(),
      });

      expect(mockSprintEvaluationModel.create).toHaveBeenCalledWith({
        groupId: dto.groupId,
        sprintId: dto.sprintId,
        evaluationType: dto.evaluationType,
        rubricId: '44444444-4444-4444-8444-444444444441',
        responses: dto.responses,
        averageScore: 88,
        status: SprintEvaluationStatus.SUBMITTED,
      });
    });

    it('throws HttpException 423 when the sprint window is closed', async () => {
      mockScheduleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.recordSprintEvaluation(dto as never, caller),
      ).rejects.toMatchObject({
        status: HttpStatus.LOCKED,
      });
      await expect(
        service.recordSprintEvaluation(dto as never, caller),
      ).rejects.toBeInstanceOf(HttpException);
    });

    it('throws ForbiddenException when the advisor does not own the group', async () => {
      mockOpenWindow();
      mockGroupModel.findOne.mockImplementation(
        (filter: Record<string, unknown>) => {
          if (filter.assignedAdvisorId) {
            return {
              exec: jest.fn().mockResolvedValue(null),
            };
          }

          return {
            exec: jest.fn().mockResolvedValue({ groupId: dto.groupId }),
          };
        },
      );

      await expect(
        service.recordSprintEvaluation(dto as never, caller),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws BadRequestException when no rubric fixture exists', async () => {
      const missingRubricDto = {
        ...dto,
        sprintId: '99999999-9999-9999-9999-999999999999',
      };

      mockOpenWindow();
      mockOwnedGroup();

      await expect(
        service.recordSprintEvaluation(missingRubricDto as never, caller),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when response questions do not match the rubric', async () => {
      const mismatchedDto = {
        ...dto,
        responses: [
          {
            questionId: '55555555-5555-4555-8555-555555555551',
            softGrade: 'A' as const,
          },
        ],
      };

      mockOpenWindow();
      mockOwnedGroup();

      await expect(
        service.recordSprintEvaluation(mismatchedDto as never, caller),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws ConflictException when a duplicate evaluation already exists', async () => {
      mockOpenWindow();
      mockOwnedGroup();
      mockSprintEvaluationModel.findOne.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ evaluationId: 'existing-evaluation' }),
      });

      await expect(
        service.recordSprintEvaluation(dto as never, caller),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('getSprintEvaluation', () => {
    it('returns a sprint evaluation for a coordinator caller', async () => {
      const evaluationDocument = {
        evaluationId: 'evaluation-1',
        groupId: '66666666-6666-4666-8666-666666666661',
        sprintId: '22222222-2222-4222-8222-222222222222',
        evaluationType: SprintEvaluationType.SCRUM,
        rubricId: '44444444-4444-4444-8444-444444444441',
        responses: [
          {
            questionId: '55555555-5555-4555-8555-555555555551',
            softGrade: 'A',
          },
        ],
        averageScore: 88,
        status: SprintEvaluationStatus.SUBMITTED,
      };

      mockSprintEvaluationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(evaluationDocument),
      });

      const result = await service.getSprintEvaluation('evaluation-1', {
        userId: 'coordinator-1',
        role: Role.Coordinator,
      });

      expect(result.evaluationId).toBe('evaluation-1');
      expect(result.averageScore).toBe(88);
      expect(mockSprintEvaluationModel.findOne).toHaveBeenCalledWith({
        evaluationId: 'evaluation-1',
      });
    });

    it('throws ForbiddenException when a professor accesses another group', async () => {
      mockSprintEvaluationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          evaluationId: 'evaluation-1',
          groupId: '66666666-6666-4666-8666-666666666661',
        }),
      });
      mockGroupModel.findOne.mockImplementation(
        (filter: Record<string, unknown>) => {
          if (filter.assignedAdvisorId) {
            return { exec: jest.fn().mockResolvedValue(null) };
          }

          return {
            exec: jest.fn().mockResolvedValue({
              groupId: '66666666-6666-4666-8666-666666666661',
            }),
          };
        },
      );

      await expect(
        service.getSprintEvaluation('evaluation-1', {
          userId: 'advisor-1',
          role: Role.Professor,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException when the evaluation does not exist', async () => {
      mockSprintEvaluationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.getSprintEvaluation('evaluation-1', {
          userId: 'coordinator-1',
          role: Role.Coordinator,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
