import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../auth/enums/role.enum';
import { AdvisorRequestsController } from './advisor-requests.controller';
import { AdvisorsService } from './advisors.service';
import { AdvisorDecision } from './dto/decision-request.dto';

type SubmitRequestArg = Parameters<
  AdvisorRequestsController['submitRequest']
>[0];
type SubmitRequestBody = Parameters<
  AdvisorRequestsController['submitRequest']
>[1];
type DecideRequestArg = Parameters<
  AdvisorRequestsController['decideRequest']
>[0];
type DecideRequestBody = Parameters<
  AdvisorRequestsController['decideRequest']
>[2];

describe('AdvisorRequestsController', () => {
  let controller: AdvisorRequestsController;

  const mockAdvisorsService = {
    submitRequest: jest.fn(),
    decideRequest: jest.fn(),
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

    controller = module.get<AdvisorRequestsController>(
      AdvisorRequestsController,
    );
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
      user: { role: Role.TeamLeader, userId: 'leader-1' },
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

  it('should delegate advisor decision to service for advisors', async () => {
    const expected = {
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      groupId: 'group-1',
      submittedBy: 'leader-1',
      requestedAdvisorId: 'advisor-1',
      status: 'APPROVED',
    };

    mockAdvisorsService.decideRequest.mockResolvedValue(expected);

    const request = {
      user: { role: Role.Professor, userId: 'advisor-1' },
    } as DecideRequestArg;

    const body: DecideRequestBody = {
      decision: AdvisorDecision.APPROVE,
    };

    const result = await controller.decideRequest(
      request,
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      body,
    );

    expect(mockAdvisorsService.decideRequest).toHaveBeenCalledWith({
      requestId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      advisorId: 'advisor-1',
      decision: AdvisorDecision.APPROVE,
    });
    expect(result).toEqual(expected);
  });
});
