import 'multer';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Submission } from './schemas/submission.schema';
import { User, UserDocument } from '../users/data/user.schema';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(Submission.name) private submissionModel: Model<Submission>,
    @InjectModel(User.name) private userModel: Model<UserDocument>
  ) {}

  async findMySubmissions(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user?.teamId) return [];

    return this.submissionModel
      .find({ groupId: user.teamId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async uploadDocumentForUser(userId: string, submissionId: string, file: Express.Multer.File) {
    if (!isValidObjectId(submissionId)) {
      throw new NotFoundException('Submission not found.');
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user?.teamId) {
      throw new NotFoundException('Submission not found.');
    }

    const submission = await this.submissionModel.findOne({
      _id: submissionId,
      groupId: user.teamId,
    });

    if (!submission) {
      throw new NotFoundException('Submission not found.');
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