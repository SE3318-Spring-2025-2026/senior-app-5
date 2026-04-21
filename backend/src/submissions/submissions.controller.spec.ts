import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

describe('SubmissionsController', () => {
  let controller: SubmissionsController;
  let service: { createSubmission: jest.Mock; uploadDocument: jest.Mock; getCompleteness: jest.Mock };

  beforeEach(async () => {
    service = {
      createSubmission: jest.fn(),
      uploadDocument: jest.fn(),
      getCompleteness: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionsController],
      providers: [
        {
          provide: SubmissionsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<SubmissionsController>(SubmissionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCompleteness', () => {
    it('should return completeness data', async () => {
      const completenessData = {
        submissionId: 'sub-1',
        isComplete: true,
        missingFields: [],
        requiredFields: ['title'],
        phaseId: 'phase-1',
      };
      service.getCompleteness.mockResolvedValue(completenessData);

      const result = await controller.getCompleteness('sub-1');

      expect(service.getCompleteness).toHaveBeenCalledWith('sub-1');
      expect(result).toEqual(completenessData);
    });
  });
});
