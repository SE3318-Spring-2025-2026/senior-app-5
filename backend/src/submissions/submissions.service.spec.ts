import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { Submission } from './schemas/submission.schema';

describe('SubmissionsService', () => {
  let service: SubmissionsService;

  // Step 1: We create a dummy object that imitates the database (Mongoose)
  const mockSubmissionModel = {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn(),
    findById: jest.fn().mockReturnThis(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks(); //Purge old calls before each test

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        {
          provide: getModelToken(Submission.name),
          useValue: mockSubmissionModel, // Use our dummy object instead of real DB
        },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });


  describe('findAll', () => {
    it('should return all submissions when no groupId is provided', async () => {
      const mockSubmissions = [{ title: 'Doc 1' }, { title: 'Doc 2' }];
      mockSubmissionModel.exec.mockResolvedValueOnce(mockSubmissions);

      const result = await service.findAll();

     // Check if there is an empty object in find({})
      expect(mockSubmissionModel.find).toHaveBeenCalledWith({});
      // Check if the correct sorting is applied
      expect(mockSubmissionModel.sort).toHaveBeenCalledWith({ createdAt: -1 });
      // Check if the returned result matches our mock data
      expect(result).toEqual(mockSubmissions);
    });

    it('should filter submissions by groupId', async () => {
      const groupId = 'group-123';
      mockSubmissionModel.exec.mockResolvedValueOnce([]);

      await service.findAll(groupId);

      // Does it filter only those belonging to that group?
      expect(mockSubmissionModel.find).toHaveBeenCalledWith({ groupId });
      expect(mockSubmissionModel.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  describe('findOne', () => {
    it('should return a submission if found', async () => {
      const mockSubmission = { _id: 'sub-1', title: 'Test Proposal' };
      mockSubmissionModel.exec.mockResolvedValueOnce(mockSubmission);

      const result = await service.findOne('sub-1');

      expect(mockSubmissionModel.findById).toHaveBeenCalledWith('sub-1');
      expect(result).toEqual(mockSubmission);
    });

    it('should throw NotFoundException if submission not found', async () => {
      // We assume it returns null if it is not found in the database
      mockSubmissionModel.exec.mockResolvedValueOnce(null);

      //We expect it to throw NotFoundException
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});