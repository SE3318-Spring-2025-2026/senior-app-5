import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Role } from '../auth/enums/role.enum';
import { Group, GroupDocument, GroupStatus } from '../groups/group.entity';
import { PhasesService } from '../phases/phases.service';
import { User, UserDocument } from '../users/data/user.schema';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { Submission, SubmissionDocument } from './schemas/submission.schema';

type SubmissionActor = { userId?: string; role?: string; groupId?: string; };

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly phasesService: PhasesService,
  ) {}

  async assertAuthorizedGroupMember(actor: SubmissionActor, groupId: string): Promise<void> {
    if (actor.role === Role.Admin || actor.role === Role.Coordinator) return;

    const group = await this.groupModel.findOne({ groupId }).exec();
    if (!group) throw new NotFoundException(`Group with ID ${groupId} not found.`);
    if (group.status !== GroupStatus.ACTIVE) throw new ForbiddenException('Group is not active for submission operations.');
    if (String(actor.groupId) !== String(groupId)) throw new ForbiddenException('You are not authorized to perform operations for this group.');
  }

  async findById(submissionId: string): Promise<SubmissionDocument> {
    if (!isValidObjectId(submissionId)) throw new BadRequestException('Invalid Submission ID format.');
    const submission = await this.submissionModel.findById(submissionId).exec();
    if (!submission) throw new NotFoundException('Submission not found.');
    return submission;
  }

  async createSubmission(createSubmissionDto: CreateSubmissionDto) {
    const phase = await this.phasesService.findByPhaseId(createSubmissionDto.phaseId);
    if (!phase?.submissionStart || !phase?.submissionEnd) throw new BadRequestException('Submission window is not configured for this phase.');
    const now = new Date();
    if (now < phase.submissionStart || now > phase.submissionEnd) throw new BadRequestException('Submission is outside the allowed window.');

    const submission = new this.submissionModel({ ...createSubmissionDto, submittedAt: now });
    return submission.save();
  }

  async findAll(groupId?: string) {
    const query = groupId ? { groupId } : {};
    return this.submissionModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<SubmissionDocument> {
    return this.findById(id);
  }

  async uploadDocument(submissionId: string, file: Express.Multer.File) {
    const submission = await this.findById(submissionId);

    // SECURITY: Validate Window
    const phase = await this.phasesService.getPhaseById(submission.phaseId);
    if (!phase.submissionStart || !phase.submissionEnd) {
      throw new BadRequestException('Phase submission window is not configured.');
    }
    const now = new Date();
    if (now < phase.submissionStart) {
      throw new BadRequestException('Submission window has not started yet. Upload is not permitted.');
    }
    if (now >= phase.submissionEnd) {
      throw new BadRequestException('Submission window has closed. Upload is not permitted.');
    }

    // Prepare file information
    const decodedFileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const newDocument = { originalName: decodedFileName, mimeType: file.mimetype, uploadedAt: new Date() };
    submission.documents = submission.documents || [];
    submission.documents.push(newDocument as any);
    await submission.save();
    return { message: 'Document uploaded successfully.', document: newDocument };
  }

  async getCompleteness(submissionId: string) {
    const submission = await this.findById(submissionId);
    const phase = await this.phasesService.findByPhaseId(submission.phaseId);
    if (!phase) throw new NotFoundException('Phase not found.');

    const missingFields: string[] = [];
    const requiredFields = phase.requiredFields || [];

    for (const field of requiredFields) {
      if (field === 'documents') {
        if (!submission.documents || submission.documents.length === 0) missingFields.push('documents');
      } else {
        const value = submission.get(field);
        if (value === undefined || value === null || value === '') missingFields.push(field);
      }
    }

    return { submissionId, isComplete: missingFields.length === 0, missingFields, requiredFields, phaseId: submission.phaseId };
  }
}