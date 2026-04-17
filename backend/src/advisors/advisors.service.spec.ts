import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { InternalServerErrorException } from '@nestjs/common';
import { AdvisorsService } from './advisors.service';
import { User } from '../users/data/user.schema';
import { ListAdvisorsQueryDto } from './dto/list-advisors-query.dto';

describe('AdvisorsService', () => {
  let service: AdvisorsService;

  const mockQuery = {
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  const mockUserModel = {
    find: jest.fn(),
    countDocuments: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvisorsService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<AdvisorsService>(AdvisorsService);
  });

  it('should return paginated advisors from advisor-compatible role records', async () => {
    mockUserModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });
    mockUserModel.find.mockReturnValue(mockQuery);
    mockQuery.exec.mockResolvedValue([
      {
        _id: 'advisor-1',
        email: 'advisor@example.com',
        role: 'PROFESSOR',
      },
    ]);

    const query: ListAdvisorsQueryDto = {
      page: 2,
      limit: 10,
    };

    const result = await service.listAdvisors(query);

    expect(mockUserModel.countDocuments).toHaveBeenCalledWith({
      role: { $in: ['ADVISOR', 'PROFESSOR'] },
    });
    expect(mockUserModel.find).toHaveBeenCalledWith({
      role: { $in: ['ADVISOR', 'PROFESSOR'] },
    });
    expect(mockQuery.skip).toHaveBeenCalledWith(10);
    expect(mockQuery.limit).toHaveBeenCalledWith(10);
    expect(result).toEqual({
      data: [
        {
          advisorId: 'advisor-1',
          name: 'advisor@example.com',
          email: 'advisor@example.com',
          role: 'ADVISOR',
        },
      ],
      total: 1,
      page: 2,
      limit: 10,
    });
  });

  it('should map repository failures to an internal server error', async () => {
    mockUserModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });
    mockUserModel.find.mockReturnValue(mockQuery);
    mockQuery.exec.mockRejectedValue(new Error('database failure'));

    const query: ListAdvisorsQueryDto = {
      page: 1,
      limit: 20,
    };

    await expect(service.listAdvisors(query)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('should use default role and pagination values when omitted', async () => {
    mockUserModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });
    mockUserModel.find.mockReturnValue(mockQuery);
    mockQuery.exec.mockResolvedValue([
      {
        _id: 'advisor-1',
        email: 'advisor@example.com',
        role: 'ADVISOR',
      },
    ]);

    const result = await service.listAdvisors({} as ListAdvisorsQueryDto);

    expect(mockUserModel.find).toHaveBeenCalledWith({
      role: { $in: ['ADVISOR', 'PROFESSOR'] },
    });
    expect(mockQuery.skip).toHaveBeenCalledWith(0);
    expect(mockQuery.limit).toHaveBeenCalledWith(20);
    expect(result).toEqual({
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
    });
  });

  it('should return advisor response fields in API contract shape', async () => {
    mockUserModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });
    mockUserModel.find.mockReturnValue(mockQuery);
    mockQuery.exec.mockResolvedValue([
      {
        _id: 'advisor-1',
        email: 'advisor@example.com',
        role: 'PROFESSOR',
      },
    ]);

    const query: ListAdvisorsQueryDto = {
      page: 1,
      limit: 20,
    };

    const result = await service.listAdvisors(query);

    expect(Object.keys(result).sort()).toEqual([
      'data',
      'limit',
      'page',
      'total',
    ]);
    expect(result.data).toHaveLength(1);
    expect(Object.keys(result.data[0]).sort()).toEqual([
      'advisorId',
      'email',
      'name',
      'role',
    ]);
  });
});
