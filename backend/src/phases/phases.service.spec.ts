import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PhasesService } from './phases.service';
import { UpdatePhaseScheduleDto } from './dto/update-phase-schedule.dto';
import { Phase } from './phase.entity';

describe('PhasesService', () => {
  let service: PhasesService;
  const mockPhaseModel = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhasesService,
        { provide: getModelToken(Phase.name), useValue: mockPhaseModel },
      ],
    }).compile();

    service = module.get<PhasesService>(PhasesService);
  });

  it('should save valid schedule dates', async () => {
    const phaseDoc: any = {
      phaseId: 'phase-1',
      submissionStart: undefined,
      submissionEnd: undefined,
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
    };
    mockPhaseModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(phaseDoc) });

    const result = await service.updateSchedule('phase-1', {
      submissionStart: '2025-05-01T00:00:00.000Z',
      submissionEnd: '2025-05-08T00:00:00.000Z',
    } as UpdatePhaseScheduleDto);

    expect(result.submissionStart.toISOString()).toBe('2025-05-01T00:00:00.000Z');
    expect(result.submissionEnd.toISOString()).toBe('2025-05-08T00:00:00.000Z');
    expect(phaseDoc.save).toHaveBeenCalled();
  });

  it('should throw BadRequestException when submissionEnd is before submissionStart', async () => {
    mockPhaseModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ save: jest.fn() }) });

    await expect(
      service.updateSchedule('phase-1', {
        submissionStart: '2025-05-08T00:00:00.000Z',
        submissionEnd: '2025-05-01T00:00:00.000Z',
      } as UpdatePhaseScheduleDto),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when submissionStart and submissionEnd are identical', async () => {
    mockPhaseModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ save: jest.fn() }) });

    await expect(
      service.updateSchedule('phase-1', {
        submissionStart: '2025-05-01T00:00:00.000Z',
        submissionEnd: '2025-05-01T00:00:00.000Z',
      } as UpdatePhaseScheduleDto),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when given invalid date strings', async () => {
    mockPhaseModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ save: jest.fn() }) });

    await expect(
      service.updateSchedule('phase-1', {
        submissionStart: 'not-a-date',
        submissionEnd: '2025-05-08T00:00:00.000Z',
      } as UpdatePhaseScheduleDto),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException when phase does not exist', async () => {
    mockPhaseModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(
      service.updateSchedule('phase-1', {
        submissionStart: '2025-05-01T00:00:00.000Z',
        submissionEnd: '2025-05-08T00:00:00.000Z',
      } as UpdatePhaseScheduleDto),
    ).rejects.toThrow(NotFoundException);
  });
});
