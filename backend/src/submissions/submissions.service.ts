import 'multer';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Submission } from './schemas/submission.schema';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(Submission.name) private submissionModel: Model<Submission>,
  ) {}

  async uploadDocument(submissionId: string, file: Express.Multer.File) {
    // 1. Find the Submission from the database (If not, throw 404)
    const submission = await this.submissionModel.findById(submissionId);
    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found.`);
    }

    // 2. Prepare file information (metadata)
    const newDocument = {
      originalName: file.originalname,
      mimeType: file.mimetype,
      uploadedAt: new Date(),
    };

    // 3. Add the file to the record and update the database
    submission.documents = submission.documents || [];
    submission.documents.push(newDocument);
    await submission.save();

    return {
      message: 'Document uploaded and linked successfully',
      document: newDocument,
    };
  }

}