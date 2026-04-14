import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdvisorRequestsController } from './advisor-requests.controller';
import { AdvisorsService } from './advisors.service';

type SubmitRequestArg = Parameters<AdvisorRequestsController['submitRequest']>[0];
type SubmitRequestBody = Parameters<AdvisorRequestsController['submitRequest']>[1];

describe('AdvisorRequestsController', () => {
  let controller: AdvisorRequestsController;

  const mockAdvisorsService = {
    submitRequest: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdvisorRequestsController],
      providers: [
        {
          provide: AdvisorsService,
          useValue: mockAdvisorsService,
        },
      ],
    }).compile();

    controller = module.get<AdvisorRequestsController>(AdvisorRequestsController);
  });

  it('should delegate submit request to service for team leaders', async () => {
    const expected = {
      requestId: 'request-1',
      groupId: 'group-1',
      submittedBy: 'leader-1',
      requestedAdvisorId: 'advisor-1',
      status: 'PENDING',
    };

    mockAdvisorsService.submitRequest.mockResolvedValue(expected);

    const request = {
      user: { role: 'TEAM_LEADER', userId: 'leader-1' },
    } as SubmitRequestArg;

    const body: SubmitRequestBody = {
      requestedAdvisorId: 'advisor-1',
    };

    const result = await controller.submitRequest(request, body);

    expect(mockAdvisorsService.submitRequest).toHaveBeenCalledWith({
      requestedAdvisorId: 'advisor-1',
      submittedBy: 'leader-1',
    });
    expect(result).toEqual(expected);
  });

  it('should throw ForbiddenException for non-team-leader submit', async () => {
    const request = {
      user: { role: 'COORDINATOR', userId: 'coordinator-1' },
    } as SubmitRequestArg;

    const body: SubmitRequestBody = {
      requestedAdvisorId: 'advisor-1',
    };

    await expect(controller.submitRequest(request, body)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
