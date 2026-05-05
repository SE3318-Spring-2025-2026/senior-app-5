import { Test, TestingModule } from '@nestjs/testing';
import { CreateRubricDto } from './dto/create-rubric.dto';
import { RubricsController } from './rubrics.controller';
import { RubricsService } from './rubrics.service';

describe('RubricsController', () => {
  let controller: RubricsController;

  const mockService = {
    listRubrics: jest.fn(),
    createRubric: jest.fn(),
    deleteRubric: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RubricsController],
      providers: [
        {
          provide: RubricsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get(RubricsController);
  });

  it('passes deliverableId, query, and correlation id to listRubrics', async () => {
    const response = { data: [], total: 0, page: 1, limit: 20 };
    mockService.listRubrics.mockResolvedValue(response);

    const req = {
      headers: {
        'x-correlation-id': 'corr-123',
      },
    } as never;

    const result = await controller.listRubrics(
      '33333333-3333-4333-8333-333333333333',
      { page: 1, limit: 20 },
      req,
    );

    expect(result).toEqual(response);
    expect(mockService.listRubrics).toHaveBeenCalledWith(
      '33333333-3333-4333-8333-333333333333',
      { page: 1, limit: 20 },
      'corr-123',
    );
  });

  it('passes the request body, actor id, and correlation id to createRubric', async () => {
    const body = {
      deliverableId: '33333333-3333-4333-8333-333333333333',
      name: 'Sprint 1 SCRUM Rubric',
      questions: [
        {
          criteriaName: 'Team planning quality',
          criteriaWeight: 0.4,
        },
        {
          criteriaName: 'Sprint execution quality',
          criteriaWeight: 0.6,
        },
      ],
    } as CreateRubricDto;

    const response = { rubricId: 'rubric-1' };
    mockService.createRubric.mockResolvedValue(response);

    const req = {
      user: {
        sub: 'coord-1',
        role: 'Coordinator',
      },
      headers: {
        'x-correlation-id': 'corr-456',
      },
    } as never;

    const result = await controller.createRubric(
      '33333333-3333-4333-8333-333333333333',
      body,
      req,
    );

    expect(result).toEqual(response);
    expect(mockService.createRubric).toHaveBeenCalledWith(
      body,
      'coord-1',
      'corr-456',
    );
  });

  it('throws when body deliverableId does not match the route', async () => {
    await expect(
      controller.createRubric(
        '33333333-3333-4333-8333-333333333333',
        {
          deliverableId: '44444444-4444-4444-8444-444444444444',
          name: 'Sprint 1 SCRUM Rubric',
          questions: [],
        } as CreateRubricDto,
        { user: {}, headers: {} } as never,
      ),
    ).rejects.toThrow('Deliverable ID mismatch');
  });

  it('passes rubricId and correlation id to deleteRubric', async () => {
    mockService.deleteRubric.mockResolvedValue(undefined);

    const req = {
      headers: {
        'x-correlation-id': 'req-789',
      },
    } as never;

    await controller.deleteRubric(
      '33333333-3333-4333-8333-333333333333',
      'rubric-1',
      req,
    );

    expect(mockService.deleteRubric).toHaveBeenCalledWith(
      'rubric-1',
      'req-789',
    );
  });
});