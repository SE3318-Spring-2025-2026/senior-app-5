import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../auth/enums/role.enum';
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
          role: Role.Professor,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    };

    mockAdvisorsService.listAdvisors.mockResolvedValue(expected);

    const request: ListAdvisorsRequestArg = {
      user: { role: Role.Coordinator },
    } as ListAdvisorsRequestArg;

    const result = await controller.listAdvisors(request, query);

    expect(mockAdvisorsService.listAdvisors).toHaveBeenCalledWith(query);
    expect(result).toEqual(expected);
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
          role: Role.Professor,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    };

    mockAdvisorsService.listAdvisors.mockResolvedValue(expected);

    const request: ListAdvisorsRequestArg = {
      user: { role: Role.TeamLeader },
    } as ListAdvisorsRequestArg;

    const result = await controller.listAdvisors(request, query);

    expect(mockAdvisorsService.listAdvisors).toHaveBeenCalledWith(query);
    expect(result).toEqual(expected);
  });
});
