import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Group } from '../groups/group.entity';
import { PhasesService } from '../phases/phases.service';
import { User } from '../users/data/user.schema';
import {
  MAX_DOCUMENTS_PER_SUBMISSION,
  SubmissionsService,
} from './submissions.service';
import { Submission } from './schemas/submission.schema';

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('file-content')),
}));

describe('SubmissionsService', () => {
  let service: SubmissionsService;

  const mockSave = jest.fn();
  const mockFindById = jest.fn().mockReturnValue({ exec: jest.fn() });

  const mockSubmissionModel: any = jest
    .fn()
    .mockImplementation((payload: Record<string, unknown>) => ({
      ...payload,
      save: mockSave,
    }));

  mockSubmissionModel.findById = mockFindById;
  mockSubmissionModel.find = jest.fn().mockReturnThis();
  mockSubmissionModel.sort = jest.fn().mockReturnThis();
  mockSubmissionModel.exec = jest.fn();

  const mockGroupModel = { findOne: jest.fn() };
  const mockUserModel = { findById: jest.fn() };

  const phasesService = {
    findByPhaseId: jest.fn(),
    getPhaseById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSave.mockReset();
    mockSubmissionModel.mockClear();
    mockFindById.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        {
          provide: getModelToken(Submission.name),
          useValue: mockSubmissionModel,
        },
        { provide: getModelToken(Group.name), useValue: mockGroupModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: PhasesService, useValue: phasesService },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadDocument', () => {
    it('should append a valid document and save submission', async () => {
      const submission = {
        _id: '64f1a2b3c4d5e6f7a8b9c0d1',
        phaseId: 'phase-1',
        documents: [],
        save: jest.fn().mockResolvedValue(undefined),
      } as any;

      phasesService.getPhaseById.mockResolvedValue({
        phaseId: 'phase-1',
        submissionStart: new Date(Date.now() - 60_000),
        submissionEnd: new Date(Date.now() + 60_000),
      });

      const file = {
        originalname: 'Report.PDF',
        mimetype: 'application/pdf',
        buffer: Buffer.from('binary-data'),
      } as Express.Multer.File;

      const result = await service.uploadDocument(
        '64f1a2b3c4d5e6f7a8b9c0d1',
        file,
        submission,
      );

      expect(submission.save).toHaveBeenCalledTimes(1);
      expect(result.message).toBe('Document uploaded successfully.');
      expect(result.document.originalName).toBe('Report.PDF');
      expect(result.document.mimeType).toBe('application/pdf');
      expect(result.document.storagePath).toBeDefined();
      expect(submission.documents).toHaveLength(1);
    });

    it('should throw NotFoundException when submission not found', async () => {
      mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const file = {
        originalname: 'report.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('binary-data'),
      } as Express.Multer.File;

      await expect(
        service.uploadDocument('64f1a2b3c4d5e6f7a8b9c0d1', file),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid submissionId format', async () => {
      const file = {
        originalname: 'report.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('binary-data'),
      } as Express.Multer.File;

      await expect(
        service.uploadDocument('not-an-objectid', file),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when max document limit is exceeded', async () => {
      const submission = {
        _id: '64f1a2b3c4d5e6f7a8b9c0d1',
        phaseId: 'phase-1',
        documents: Array.from(
          { length: MAX_DOCUMENTS_PER_SUBMISSION },
          (_, idx) => ({
            originalName: `doc-${idx}.pdf`,
            mimeType: 'application/pdf',
            uploadedAt: new Date(),
            storagePath: `path-${idx}`,
          }),
        ),
        save: jest.fn().mockResolvedValue(undefined),
      } as any;

      phasesService.getPhaseById.mockResolvedValue({
        phaseId: 'phase-1',
        submissionStart: new Date(Date.now() - 60_000),
        submissionEnd: new Date(Date.now() + 60_000),
      });

      const file = {
        originalname: 'report.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('binary-data'),
      } as Express.Multer.File;

      await expect(
        service.uploadDocument('64f1a2b3c4d5e6f7a8b9c0d1', file, submission),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
