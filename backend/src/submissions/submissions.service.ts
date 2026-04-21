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

  
  async findById(id: string): Promise<SubmissionDocument> {
    const submission = await this.submissionModel.findById(id).exec();
    if (!submission) {
      throw new NotFoundException(`Submission with ID ${id} not found.`);
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

    const newDocument = {
      originalName: file.originalname,
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

  async findById(submissionId: string): Promise<Submission> {
    const submission = await this.submissionModel.findById(submissionId).exec();
    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found.`);
    }
    return submission;
  }

  async getCompleteness(submissionId: string) {
    const submission = await this.findById(submissionId);
    const phase = await this.phasesService.findByPhaseId(submission.phaseId);

    const missingFields: string[] = [];
    const requiredFields = phase.requiredFields || [];

    for (const field of requiredFields) {
      if (field === 'title' && !submission.title) {
        missingFields.push('title');
      } else if (field === 'documents' && (!submission.documents || submission.documents.length === 0)) {
        missingFields.push('documents');
      } else if (field === 'groupId' && !submission.groupId) {
        missingFields.push('groupId');
      } else if (field === 'type' && !submission.type) {
        missingFields.push('type');
      } else if (field === 'phaseId' && !submission.phaseId) {
        missingFields.push('phaseId');
      }
      // Add more fields as needed
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
}
