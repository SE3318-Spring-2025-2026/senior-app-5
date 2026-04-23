import 'multer';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PhasesService } from '../phases/phases.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { Submission, SubmissionDocument } from './schemas/submission.schema';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(Submission.name)
    private submissionModel: Model<SubmissionDocument>,
    private readonly phasesService: PhasesService,
  ) {}

  async findById(submissionId: string): Promise<SubmissionDocument> {
    const submission = await this.submissionModel.findById(submissionId).exec();
    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found.`);
    }
    return submission;
  }

  async createSubmission(createSubmissionDto: CreateSubmissionDto) {
    const phase = await this.phasesService.findByPhaseId(createSubmissionDto.phaseId);
    if (!phase.submissionStart || !phase.submissionEnd) {
      throw new BadRequestException('Submission window is not configured for this phase');
    }
    const now = new Date();
    if (now < phase.submissionStart || now > phase.submissionEnd) {
      throw new BadRequestException('Submission is outside the allowed submission window for this phase');
    }
    const submission = new this.submissionModel({
      ...createSubmissionDto,
      submittedAt: now,
    });
    return submission.save();
  }

  async uploadDocument(submissionId: string, file: Express.Multer.File) {
    const submission = await this.findById(submissionId);

    
    const decodedFileName = Buffer.from(file.originalname, 'latin1').toString('utf8');

    const newDocument = {
      originalName: decodedFileName,
      mimeType: file.mimetype,
      uploadedAt: new Date(),
    };
    submission.documents = submission.documents || [];
    submission.documents.push(newDocument);
    await submission.save();
    return {
      message: 'Document uploaded and linked successfully',
      document: newDocument,
    };
  }

  async getCompleteness(submissionId: string) {
    const submission = await this.findById(submissionId);
    const phase = await this.phasesService.findByPhaseId(submission.phaseId);
    if (!phase) {
      throw new NotFoundException(`Phase with ID ${submission.phaseId} not found.`);
    }
    const missingFields: string[] = [];
    const requiredFields = phase.requiredFields || [];
    for (const field of requiredFields) {
      if (field === 'documents') {
        if (!submission.documents || submission.documents.length === 0) {
          missingFields.push('documents');
        }
      } else {
        const isFieldInSchema = this.submissionModel.schema.path(field);
        if (!isFieldInSchema) {
          console.warn(`Warning: Field '${field}' does not exist in the Submission schema. Skipping check.`);
          continue;
        }
        const value = submission.get(field);
        if (value === undefined || value === null || value === '') {
          missingFields.push(field);
        }
      }
    }
    const isComplete = missingFields.length === 0;
    return {
      submissionId,
      isComplete,
      missingFields,
      requiredFields,
      phaseId: submission.phaseId,
    };
  }

  async findAll(groupId?: string) {
    const query = groupId ? { groupId } : {};
    return this.submissionModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<SubmissionDocument> {
    return this.findById(id);
  }
}