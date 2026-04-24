import 'multer';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Submission } from './schemas/submission.schema';
import { PhasesService } from '../phases/phases.service';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(Submission.name) private submissionModel: Model<Submission>,
    private readonly phasesService: PhasesService,
  ) {}

  async uploadDocument(submissionId: string, file: Express.Multer.File) {
    // 1. Find the Submission from the database (If not, throw 404)
    const submission = await this.submissionModel.findById(submissionId);
    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found.`);
    }

    // 2. SECURITY: Fetch the associated phase and validate submission window
    const phase = await this.phasesService.getPhaseById(submission.phaseId);
    
    // Check if phase has submission window configured
    if (!phase.submissionStart || !phase.submissionEnd) {
      throw new BadRequestException(
        'Phase submission window is not configured.'
      );
    }

    // Check if current time is within the submission window
    const now = new Date();
    if (now < phase.submissionStart) {
      throw new BadRequestException(
        'Submission window has not started yet. Upload is not permitted.'
      );
    }
    if (now >= phase.submissionEnd) {
      throw new BadRequestException(
        'Submission window has closed. Upload is not permitted.'
      );
    }

    // 3. Prepare file information (metadata)
    const newDocument = {
      originalName: file.originalname,
      mimeType: file.mimetype,
      uploadedAt: new Date(),
    };

    // 4. Add the file to the record and update the database
    submission.documents = submission.documents || [];
    submission.documents.push(newDocument);
    await submission.save();

    return {
      message: 'Document uploaded and linked successfully',
      document: newDocument,
    };
  }

}