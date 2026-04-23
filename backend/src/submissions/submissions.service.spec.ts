import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SubmissionsService } from './submissions.service';
import { PhasesService } from '../phases/phases.service';
import { Submission } from './schemas/submission.schema';
import { NotFoundException } from '@nestjs/common';

describe('SubmissionsService - Completeness QA Tests', () => {
  let service: SubmissionsService;
  let mockSubmissionModel: any;
  let mockPhasesService: any;

  beforeEach(async () => {
    mockSubmissionModel = {
      findById: jest.fn(),
      schema: { path: jest.fn().mockReturnValue(true) },
    };
    mockPhasesService = { findByPhaseId: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        { provide: getModelToken(Submission.name), useValue: mockSubmissionModel },
        { provide: PhasesService, useValue: mockPhasesService },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
  });

  afterEach(() => { jest.clearAllMocks(); });

  describe('getCompleteness Logic (Issue #65)', () => {
    
    it('should return isComplete: false and list ALL missing fields if nothing is provided', async () => {
      const mockSubmission = { _id: 'sub-1', phaseId: 'phase-1', documents: [], get: jest.fn().mockReturnValue(null) };
      mockSubmissionModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockSubmission) });
      mockPhasesService.findByPhaseId.mockResolvedValue({ phaseId: 'phase-1', requiredFields: ['documents', 'projectTitle'] });

      const result = await service.getCompleteness('sub-1');
      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toEqual(['documents', 'projectTitle']);
    });

    it('should return isComplete: false and exactly the missing fields for a partial submission', async () => {
      const mockSubmission = { _id: 'sub-2', phaseId: 'phase-1', documents: [{ originalName: 'doc.pdf' }], get: jest.fn().mockReturnValue('') };
      mockSubmissionModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockSubmission) });
      mockPhasesService.findByPhaseId.mockResolvedValue({ requiredFields: ['documents', 'projectTitle'] });

      const result = await service.getCompleteness('sub-2');
      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toEqual(['projectTitle']);
    });

    it('should return isComplete: true and empty missingFields array when everything is met', async () => {
      const mockSubmission = { _id: 'sub-3', phaseId: 'phase-2', documents: [{ originalName: 'doc.pdf' }], get: jest.fn().mockReturnValue('Title') };
      mockSubmissionModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockSubmission) });
      mockPhasesService.findByPhaseId.mockResolvedValue({ requiredFields: ['documents', 'projectTitle'] });

      const result = await service.getCompleteness('sub-3');
      expect(result.isComplete).toBe(true);
      expect(result.missingFields).toEqual([]);
    });

    it('should throw NotFoundException if Phase does not exist', async () => {
      const mockSubmission = { _id: 'sub-4', phaseId: 'invalid-phase' };
      mockSubmissionModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockSubmission) });
      mockPhasesService.findByPhaseId.mockResolvedValue(null);

      await expect(service.getCompleteness('sub-4')).rejects.toThrow(NotFoundException);
    });
  });
});