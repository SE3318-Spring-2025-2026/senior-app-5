import 'multer';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  async createSubmission(createSubmissionDto: CreateSubmissionDto) {
    const phase = await this.phasesService.findByPhaseId(
      createSubmissionDto.phaseId,
    );

    if (!phase.submissionStart || !phase.submissionEnd) {
      throw new BadRequestException(
        'Submission window is not configured for this phase',
      );
    }

    const now = new Date();
    if (now < phase.submissionStart || now > phase.submissionEnd) {
      throw new BadRequestException(
        'Submission is outside the allowed submission window for this phase',
      );
    }

    const submission = new this.submissionModel({
      ...createSubmissionDto,
      submittedAt: now,
    });

    return submission.save();
  }

  async uploadDocument(submissionId: string, file: Express.Multer.File) {
    const submission = await this.submissionModel.findById(submissionId);
    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found.`);
    }

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
}
