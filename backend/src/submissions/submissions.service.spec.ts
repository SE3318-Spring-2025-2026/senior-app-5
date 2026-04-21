import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { PhasesService } from '../phases/phases.service';
import { Submission } from './schemas/submission.schema';
import { SubmissionsService } from './submissions.service';

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let phasesService: { findByPhaseId: jest.Mock };

  const mockSave = jest.fn();
  const mockSubmissionModel = jest
    .fn()
    .mockImplementation((payload: Record<string, unknown>) => ({
      ...payload,
      save: mockSave,
    }));

  beforeEach(async () => {
    mockSave.mockReset();
    mockSubmissionModel.mockClear();

    phasesService = {
      findByPhaseId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        {
          provide: getModelToken(Submission.name),
          useValue: mockSubmissionModel,
        },
        {
          provide: PhasesService,
          useValue: phasesService,
        },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return 404 when phaseId is invalid', async () => {
    phasesService.findByPhaseId.mockRejectedValue(
      new NotFoundException('Phase not found'),
    );

    await expect(
      service.createSubmission({
        title: 'Proposal',
        groupId: 'group-1',
        type: 'INITIAL',
        phaseId: 'missing-phase',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should return 400 when submission window is not configured', async () => {
    phasesService.findByPhaseId.mockResolvedValue({
      phaseId: 'phase-1',
      submissionStart: undefined,
      submissionEnd: undefined,
    });

    await expect(
      service.createSubmission({
        title: 'Proposal',
        groupId: 'group-1',
        type: 'INITIAL',
        phaseId: 'phase-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should return 400 when submission is outside configured window', async () => {
    const now = new Date();
    const oneHour = 60 * 60 * 1000;

    phasesService.findByPhaseId.mockResolvedValue({
      phaseId: 'phase-1',
      submissionStart: new Date(now.getTime() - 2 * oneHour),
      submissionEnd: new Date(now.getTime() - oneHour),
    });

    await expect(
      service.createSubmission({
        title: 'Proposal',
        groupId: 'group-1',
        type: 'INITIAL',
        phaseId: 'phase-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should save submission when request time is within configured window', async () => {
    const now = new Date();
    const oneHour = 60 * 60 * 1000;
    const savedSubmission = {
      _id: 'submission-1',
      title: 'Proposal',
      groupId: 'group-1',
      type: 'INITIAL',
      phaseId: 'phase-1',
      status: 'Pending',
      submittedAt: now,
    };

    phasesService.findByPhaseId.mockResolvedValue({
      phaseId: 'phase-1',
      submissionStart: new Date(now.getTime() - oneHour),
      submissionEnd: new Date(now.getTime() + oneHour),
    });
    mockSave.mockResolvedValue(savedSubmission);

    const result = await service.createSubmission({
      title: 'Proposal',
      groupId: 'group-1',
      type: 'INITIAL',
      phaseId: 'phase-1',
    });

    expect(mockSubmissionModel).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(result).toEqual(savedSubmission);
  });
});
