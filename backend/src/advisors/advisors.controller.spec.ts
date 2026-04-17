import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AdvisorsController } from './advisors.controller';
import { AdvisorsService } from './advisors.service';

type ListAdvisorsRequestArg = Parameters<AdvisorsController['listAdvisors']>[0];
type ListAdvisorsQueryArg = Parameters<AdvisorsController['listAdvisors']>[1];

describe('AdvisorsController', () => {
  let controller: AdvisorsController;

  const mockAdvisorsService = {
    listAdvisors: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdvisorsController],
      providers: [
        {
          provide: AdvisorsService,
          useValue: mockAdvisorsService,
        },
      ],
    }).compile();

    controller = module.get<AdvisorsController>(AdvisorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate advisor listing to the service', async () => {
    const query: ListAdvisorsQueryArg = {
      page: 1,
      limit: 20,
    };
    const expected = {
      data: [
        {
          advisorId: 'advisor-1',
          name: 'advisor@example.com',
          email: 'advisor@example.com',
          role: 'ADVISOR',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    };

    mockAdvisorsService.listAdvisors.mockResolvedValue(expected);

    const request: ListAdvisorsRequestArg = {
      user: { role: 'COORDINATOR' },
    } as ListAdvisorsRequestArg;

    const result = await controller.listAdvisors(request, query);

    expect(mockAdvisorsService.listAdvisors).toHaveBeenCalledWith(query);
    expect(result).toEqual(expected);
  });

  it('should throw ForbiddenException for non-coordinator roles', async () => {
    const query: ListAdvisorsQueryArg = {
      page: 1,
      limit: 20,
    };

    const request: ListAdvisorsRequestArg = {
      user: { role: 'Student' },
    } as ListAdvisorsRequestArg;

    await expect(
      controller.listAdvisors(request, query),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should allow team leader role', async () => {
    const query: ListAdvisorsQueryArg = {
      page: 1,
      limit: 20,
    };

    const expected = {
      data: [
        {
          advisorId: 'advisor-1',
          name: 'advisor@example.com',
          email: 'advisor@example.com',
          role: 'ADVISOR',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    };

    mockAdvisorsService.listAdvisors.mockResolvedValue(expected);

    const request: ListAdvisorsRequestArg = {
      user: { role: 'TEAM_LEADER' },
    } as ListAdvisorsRequestArg;

    const result = await controller.listAdvisors(request, query);

    expect(mockAdvisorsService.listAdvisors).toHaveBeenCalledWith(query);
    expect(result).toEqual(expected);
  });
});
