import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

describe('DocumentsController', () => {
  let controller: DocumentsController;

  const mockService = {
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [{ provide: DocumentsService, useValue: mockService }],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
  });

  const req = { user: { userId: 'u1', role: 'Student', groupId: 'g1' } } as any;

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('delegates to service and returns the response', async () => {
      const dto = { submissionId: 's1', title: 't', contentMarkdown: '# A' };
      const expected = { documentId: 'd1' };
      mockService.create.mockResolvedValue(expected);

      const result = await controller.create(req, dto as any);

      expect(mockService.create).toHaveBeenCalledWith(req.user, dto);
      expect(result).toBe(expected);
    });

    it('propagates ForbiddenException from service', async () => {
      mockService.create.mockRejectedValue(new ForbiddenException());
      await expect(
        controller.create(req, {
          submissionId: 's',
          title: 't',
          contentMarkdown: '#A',
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('delegates to service', async () => {
      mockService.findOne.mockResolvedValue({ documentId: 'd1' });
      const out = await controller.findOne(req, 'd1');
      expect(mockService.findOne).toHaveBeenCalledWith(req.user, 'd1');
      expect(out).toEqual({ documentId: 'd1' });
    });
  });

  describe('update', () => {
    it('delegates to service', async () => {
      mockService.update.mockResolvedValue({ documentId: 'd1' });
      const out = await controller.update(req, 'd1', { title: 'new' });
      expect(mockService.update).toHaveBeenCalledWith(req.user, 'd1', {
        title: 'new',
      });
      expect(out).toEqual({ documentId: 'd1' });
    });
  });
});
