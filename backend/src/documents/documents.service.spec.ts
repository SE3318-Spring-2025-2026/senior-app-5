import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { DocumentsService } from './documents.service';
import { MarkdownDocument } from './schemas/markdown-document.schema';
import { SubmissionsService } from '../submissions/submissions.service';

describe('DocumentsService', () => {
  let service: DocumentsService;

  const mockSubmissions = {
    findById: jest.fn(),
    assertAuthorizedGroupMember: jest.fn(),
  };

  const mockModel: any = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: getModelToken(MarkdownDocument.name), useValue: mockModel },
        { provide: SubmissionsService, useValue: mockSubmissions },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  const actor = { userId: 'u1', role: 'Student', groupId: 'g1' };

  describe('create', () => {
    it('creates a new markdown document with sections', async () => {
      mockSubmissions.findById.mockResolvedValue({ _id: 's1', groupId: 'g1' });
      mockSubmissions.assertAuthorizedGroupMember.mockResolvedValue(undefined);
      mockModel.findOne.mockReturnValue({ exec: () => Promise.resolve(null) });
      mockModel.create.mockImplementation(async (doc: any) => ({
        ...doc,
        documentId: 'd-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await service.create(actor, {
        submissionId: 's1',
        title: 'Plan',
        contentMarkdown: '# Goals\n\nbody\n\n## Scope',
      });

      expect(mockSubmissions.findById).toHaveBeenCalledWith('s1');
      expect(mockSubmissions.assertAuthorizedGroupMember).toHaveBeenCalledWith(
        actor,
        'g1',
      );
      expect(result.sections).toHaveLength(2);
      expect(result.groupId).toBe('g1');
    });

    it('upserts when one already exists for the submission', async () => {
      mockSubmissions.findById.mockResolvedValue({ _id: 's1', groupId: 'g1' });
      mockSubmissions.assertAuthorizedGroupMember.mockResolvedValue(undefined);
      const existing = {
        documentId: 'd-1',
        submissionId: 's1',
        groupId: 'g1',
        title: 'old',
        contentMarkdown: '# Old',
        sections: [],
        save: jest.fn().mockImplementation(async function (this: any) {
          this.createdAt = new Date();
          this.updatedAt = new Date();
          return this;
        }),
      };
      mockModel.findOne.mockReturnValue({
        exec: () => Promise.resolve(existing),
      });

      const result = await service.create(actor, {
        submissionId: 's1',
        title: 'new',
        contentMarkdown: '# New',
      });

      expect(existing.save).toHaveBeenCalled();
      expect(result.title).toBe('new');
      expect(mockModel.create).not.toHaveBeenCalled();
    });

    it('propagates ForbiddenException from ownership check', async () => {
      mockSubmissions.findById.mockResolvedValue({ _id: 's1', groupId: 'g1' });
      mockSubmissions.assertAuthorizedGroupMember.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(
        service.create(actor, {
          submissionId: 's1',
          title: 't',
          contentMarkdown: '# A',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('returns a document when authorized', async () => {
      const doc = {
        documentId: 'd-1',
        submissionId: 's1',
        groupId: 'g1',
        title: 't',
        contentMarkdown: '# A',
        sections: [
          { sectionId: 'sx', heading: 'A', level: 1, order: 0, slug: 'a' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockModel.findOne.mockReturnValue({ exec: () => Promise.resolve(doc) });
      mockSubmissions.assertAuthorizedGroupMember.mockResolvedValue(undefined);

      const out = await service.findOne(actor, 'd-1');
      expect(out.documentId).toBe('d-1');
      expect(out.sections).toHaveLength(1);
    });

    it('throws NotFoundException when missing', async () => {
      mockModel.findOne.mockReturnValue({ exec: () => Promise.resolve(null) });
      await expect(service.findOne(actor, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates content and regenerates sections with stable IDs', async () => {
      const prevSections = [
        {
          sectionId: 'stable-id',
          heading: 'Goals',
          level: 1,
          order: 0,
          slug: 'goals',
        },
      ];
      const doc = {
        documentId: 'd-1',
        submissionId: 's1',
        groupId: 'g1',
        title: 't',
        contentMarkdown: '# Goals',
        sections: prevSections,
        save: jest.fn().mockImplementation(async function (this: any) {
          this.createdAt = new Date();
          this.updatedAt = new Date();
          return this;
        }),
      };
      mockModel.findOne.mockReturnValue({ exec: () => Promise.resolve(doc) });
      mockSubmissions.assertAuthorizedGroupMember.mockResolvedValue(undefined);

      const out = await service.update(actor, 'd-1', {
        contentMarkdown: '# Goals\n\nedited body',
      });

      expect(doc.save).toHaveBeenCalled();
      expect(out.sections[0].sectionId).toBe('stable-id');
    });

    it('throws NotFoundException when missing', async () => {
      mockModel.findOne.mockReturnValue({ exec: () => Promise.resolve(null) });
      await expect(service.update(actor, 'x', { title: 'y' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
