import { Test, TestingModule } from '@nestjs/testing';
import { SprintEvaluationsController } from './sprint-evaluations.controller';
import { SprintEvaluationsService } from './sprint-evaluations.service';
import { CreateSprintEvaluationDto } from './dto/create-sprint-evaluation.dto';
import { SprintEvaluationType } from './schemas/sprint-evaluation.schema';

describe('SprintEvaluationsController', () => {
  let controller: SprintEvaluationsController;

  const mockService = {
    recordSprintEvaluation: jest.fn(),
    getSprintEvaluation: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SprintEvaluationsController],
      providers: [
        {
          provide: SprintEvaluationsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get(SprintEvaluationsController);
  });

  it('passes the request body, caller, and correlation id to recordSprintEvaluation', async () => {
    const body = {
      groupId: '11111111-1111-1111-1111-111111111111',
      sprintId: '22222222-2222-2222-2222-222222222222',
      evaluationType: SprintEvaluationType.SCRUM,
      responses: [],
    } as CreateSprintEvaluationDto;

    const response = { evaluationId: 'evaluation-1' };
    mockService.recordSprintEvaluation.mockResolvedValue(response);

    const req = {
      user: {
        userId: 'advisor-1',
        role: 'Professor',
      },
      headers: {
        'x-correlation-id': 'corr-123',
      },
    } as never;

    const result = await controller.recordSprintEvaluation(body, req);

    expect(result).toEqual(response);
    expect(mockService.recordSprintEvaluation).toHaveBeenCalledWith(
      body,
      { userId: 'advisor-1', role: 'Professor' },
      'corr-123',
    );
  });

  it('passes the evaluation id, caller, and correlation id to getSprintEvaluation', async () => {
    const response = { evaluationId: 'evaluation-1' };
    mockService.getSprintEvaluation.mockResolvedValue(response);

    const req = {
      user: {
        sub: 'coordinator-1',
        role: 'Coordinator',
      },
      headers: {
        'x-request-id': 'req-456',
      },
    } as never;

    const result = await controller.getSprintEvaluation(
      '11111111-1111-1111-1111-111111111111',
      req,
    );

    expect(result).toEqual(response);
    expect(mockService.getSprintEvaluation).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      { userId: 'coordinator-1', role: 'Coordinator' },
      'req-456',
    );
  });
});
