import { PhasesService } from './phases.service';

describe('PhasesService', () => {
  describe('createPhase', () => {
    it('creates a phase with a server-generated phaseId, name, and empty required fields', async () => {
      const savedPhase = {
        phaseId: 'server-generated-id',
        name: 'Proposal Submission',
        requiredFields: [],
        save: jest.fn(),
      };
      savedPhase.save.mockResolvedValue(savedPhase);

      const phaseModel = jest.fn().mockImplementation((data) => ({
        ...savedPhase,
        ...data,
        phaseId: savedPhase.phaseId,
        save: savedPhase.save,
      }));
      const service = new PhasesService(phaseModel as any);

      const result = await service.createPhase({ name: 'Proposal Submission' });

      expect(phaseModel).toHaveBeenCalledWith({
        name: 'Proposal Submission',
        requiredFields: [],
      });
      expect(savedPhase.save).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          phaseId: 'server-generated-id',
          name: 'Proposal Submission',
          requiredFields: [],
        }),
      );
      expect(phaseModel.mock.calls[0][0]).not.toHaveProperty('phaseId');
    });
  });
});
