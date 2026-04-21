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
    const decodedFileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const newDocument = {
      originalName: decodedFileName,
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

  async findAll(groupId?: string) {
    // If the groupId parameter is included, find only that group; if not, find all of them.
    const query = groupId ? { groupId } : {};
    
    // timestamps: Since it is true, we arrange the newest ones at the top according to the createdAt field.
    return this.submissionModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    const submission = await this.submissionModel.findById(id).exec();
    
    if (!submission) {
      throw new NotFoundException(`Submission with ID ${id} not found.`);
    }
    
    return submission;
  }
  
}