import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  MarkdownDocument,
  MarkdownDocumentDocument,
} from './schemas/markdown-document.schema';
import { CreateMarkdownDocumentDto } from './dto/create-markdown-document.dto';
import { UpdateMarkdownDocumentDto } from './dto/update-markdown-document.dto';
import { MarkdownDocumentResponse } from './dto/markdown-document.response.dto';
import { extractSections } from './utils/section-extractor';
import { SubmissionsService } from '../submissions/submissions.service';

type DocumentActor = { userId?: string; role?: string; groupId?: string };

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectModel(MarkdownDocument.name)
    private readonly model: Model<MarkdownDocumentDocument>,
    private readonly submissionsService: SubmissionsService,
  ) {}

  async create(
    actor: DocumentActor,
    dto: CreateMarkdownDocumentDto,
  ): Promise<MarkdownDocumentResponse> {
    const submission = await this.submissionsService.findById(dto.submissionId);
    await this.submissionsService.assertAuthorizedGroupMember(
      actor,
      submission.groupId,
    );

    const sections = extractSections(dto.contentMarkdown);

    const existing = await this.model
      .findOne({ submissionId: dto.submissionId })
      .exec();
    if (existing) {
      existing.title = dto.title;
      existing.contentMarkdown = dto.contentMarkdown;
      existing.sections = extractSections(
        dto.contentMarkdown,
        existing.sections,
      );
      existing.updatedBy = actor.userId;
      const saved = await existing.save();
      this.logger.log(
        `markdown.upsert documentId=${saved.documentId} submissionId=${saved.submissionId} actor=${actor.userId}`,
      );
      return this.toResponse(saved);
    }

    const created = await this.model.create({
      submissionId: dto.submissionId,
      groupId: submission.groupId,
      title: dto.title,
      contentMarkdown: dto.contentMarkdown,
      sections,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    this.logger.log(
      `markdown.create documentId=${created.documentId} submissionId=${created.submissionId} actor=${actor.userId}`,
    );
    return this.toResponse(created);
  }

  async findOne(
    actor: DocumentActor,
    documentId: string,
  ): Promise<MarkdownDocumentResponse> {
    const doc = await this.model.findOne({ documentId }).exec();
    if (!doc) throw new NotFoundException('Markdown document not found.');
    await this.submissionsService.assertAuthorizedGroupMember(
      actor,
      doc.groupId,
    );
    this.logger.log(
      `markdown.read documentId=${doc.documentId} actor=${actor.userId}`,
    );
    return this.toResponse(doc);
  }

  async update(
    actor: DocumentActor,
    documentId: string,
    dto: UpdateMarkdownDocumentDto,
  ): Promise<MarkdownDocumentResponse> {
    const doc = await this.model.findOne({ documentId }).exec();
    if (!doc) throw new NotFoundException('Markdown document not found.');
    await this.submissionsService.assertAuthorizedGroupMember(
      actor,
      doc.groupId,
    );

    if (dto.title !== undefined) doc.title = dto.title;
    if (dto.contentMarkdown !== undefined) {
      doc.contentMarkdown = dto.contentMarkdown;
      doc.sections = extractSections(dto.contentMarkdown, doc.sections);
    }
    doc.updatedBy = actor.userId;
    const saved = await doc.save();
    this.logger.log(
      `markdown.update documentId=${saved.documentId} actor=${actor.userId}`,
    );
    return this.toResponse(saved);
  }

  private toResponse(doc: MarkdownDocumentDocument): MarkdownDocumentResponse {
    return {
      documentId: doc.documentId,
      title: doc.title,
      submissionId: doc.submissionId,
      groupId: doc.groupId,
      contentMarkdown: doc.contentMarkdown,
      sections: doc.sections.map((s) => ({
        sectionId: s.sectionId,
        heading: s.heading,
        level: s.level,
        order: s.order,
        slug: s.slug,
      })),
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
    };
  }
}
