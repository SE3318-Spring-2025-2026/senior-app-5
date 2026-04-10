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

  it('should return only professors from the users collection', async () => {
    mockUserModel.find.mockReturnValue(mockQuery);
    mockQuery.exec.mockResolvedValue([
      {
        _id: 'advisor-1',
        email: 'professor@example.com',
        role: 'PROFESSOR',
      },
    ]);

    const query: ListAdvisorsQueryDto = {
      page: 2,
      limit: 10,
      role: 'PROFESSOR',
    };

    const result = await service.listAdvisors(query);

    expect(mockUserModel.find).toHaveBeenCalledWith({ role: 'PROFESSOR' });
    expect(mockQuery.skip).toHaveBeenCalledWith(10);
    expect(mockQuery.limit).toHaveBeenCalledWith(10);
    expect(result).toEqual([
      {
        advisorId: 'advisor-1',
        name: 'professor@example.com',
        email: 'professor@example.com',
        role: 'PROFESSOR',
      },
    ]);
  });

  it('should map repository failures to an internal server error', async () => {
    mockUserModel.find.mockReturnValue(mockQuery);
    mockQuery.exec.mockRejectedValue(new Error('database failure'));

    const query: ListAdvisorsQueryDto = {
      page: 1,
      limit: 20,
      role: 'PROFESSOR',
    };

    await expect(service.listAdvisors(query)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('should use default role and pagination values when omitted', async () => {
    mockUserModel.find.mockReturnValue(mockQuery);
    mockQuery.exec.mockResolvedValue([
      {
        _id: 'advisor-1',
        email: 'professor@example.com',
        role: 'PROFESSOR',
      },
    ]);

    const result = await service.listAdvisors({} as ListAdvisorsQueryDto);

    expect(mockUserModel.find).toHaveBeenCalledWith({ role: 'PROFESSOR' });
    expect(mockQuery.skip).toHaveBeenCalledWith(0);
    expect(mockQuery.limit).toHaveBeenCalledWith(20);
    expect(result).toEqual([
      {
        advisorId: 'advisor-1',
        name: 'professor@example.com',
        email: 'professor@example.com',
        role: 'PROFESSOR',
      },
    ]);
  });

  it('should return advisor response fields in API contract shape', async () => {
    mockUserModel.find.mockReturnValue(mockQuery);
    mockQuery.exec.mockResolvedValue([
      {
        _id: 'advisor-1',
        email: 'professor@example.com',
        role: 'PROFESSOR',
      },
    ]);

    const query: ListAdvisorsQueryDto = {
      page: 1,
      limit: 20,
      role: 'PROFESSOR',
    };

    const result = await service.listAdvisors(query);

    expect(result).toHaveLength(1);
    expect(Object.keys(result[0]).sort()).toEqual([
      'advisorId',
      'email',
      'name',
      'role',
    ]);
  });
});
