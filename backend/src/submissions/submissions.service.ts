import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { Role } from '../auth/enums/role.enum';
import { Group, GroupDocument, GroupStatus } from '../groups/group.entity';
import { PhasesService } from '../phases/phases.service';
import { User, UserDocument } from '../users/data/user.schema';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { Submission, SubmissionDocument } from './schemas/submission.schema';
import { Committee, CommitteeDocument } from '../committees/schemas/committee.schema';
type SubmissionActor = { userId?: string; role?: string; groupId?: string };
type UploadedSubmissionFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

const DEFAULT_UPLOAD_DIR = 'uploads/submissions';
export const MAX_DOCUMENTS_PER_SUBMISSION = 10;

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(Submission.name)
    private submissionModel: Model<SubmissionDocument>,
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Committee.name) private committeeModel: Model<CommitteeDocument>,
    private readonly phasesService: PhasesService,
  ) {}

  async assertAuthorizedGroupMember(
    actor: SubmissionActor,
    groupId: string,
  ): Promise<void> {
    if (actor.role === Role.Admin || actor.role === Role.Coordinator) return;

    const group = await this.groupModel.findOne({ groupId }).exec();
    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found.`);
    }

    if (group.status !== GroupStatus.ACTIVE) {
      throw new ForbiddenException(
        'Group is not active for submission operations.',
      );
    }

    if (!actor.userId) {
      throw new ForbiddenException('Authenticated user context is missing.');
    }

    const user = await this.userModel.findById(actor.userId).exec();
    if (!user) {
      throw new ForbiddenException('Authenticated user not found.');
    }

    if (user.teamId !== groupId) {
      throw new ForbiddenException(
        'You are not authorized to submit for this group.',
      );
    }
  }

  async findById(submissionId: string): Promise<SubmissionDocument> {
    if (!isValidObjectId(submissionId))
      throw new BadRequestException('Invalid Submission ID format.');
    const submission = await this.submissionModel.findById(submissionId).exec();
    if (!submission) throw new NotFoundException('Submission not found.');
    return submission;
  }

  async createSubmission(createSubmissionDto: CreateSubmissionDto) {
    const phase = await this.phasesService.findByPhaseId(
      createSubmissionDto.phaseId,
    );
    if (!phase?.submissionStart || !phase?.submissionEnd)
      throw new BadRequestException(
        'Submission window is not configured for this phase.',
      );
    const now = new Date();
    if (now < phase.submissionStart || now > phase.submissionEnd)
      throw new BadRequestException(
        'Submission is outside the allowed window.',
      );

    const submission = new this.submissionModel({
      ...createSubmissionDto,
      submittedAt: now,
    });
    return submission.save();
  }

  async findAll(groupId?: string) {
    const query = groupId ? { groupId } : {};
    return this.submissionModel.find(query).sort({ createdAt: -1 }).exec();
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

    // 2. SECURITY: Fetch the associated phase and validate submission window
    const phase = await this.phasesService.getPhaseById(submission.phaseId);
    
    // Check if phase has submission window configured
    if (!phase.submissionStart || !phase.submissionEnd) {
      throw new BadRequestException('Phase submission window is not configured.');
    }

    // Check if current time is within the submission window
    const now = new Date();
    if (now < phase.submissionStart) {
      throw new BadRequestException('Submission window has not started yet. Upload is not permitted.');
    }
    if (now >= phase.submissionEnd) {
      throw new BadRequestException('Submission window has closed. Upload is not permitted.');
    }

    // 3. Prepare file information (metadata) with latin1 decoding fix from main
    const decodedFileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const newDocument = {
      originalName: decodedFileName,
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
  async findOne(id: string): Promise<SubmissionDocument> {
    return this.findById(id);
  }

  private getUploadsDirectoryPath() {
    return path.resolve(
      process.cwd(),
      process.env.SUBMISSIONS_UPLOAD_DIR ?? DEFAULT_UPLOAD_DIR,
    );
  }

  private sanitizeFilename(filename: string) {
    return filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/\s+/g, '_');
  }

  private async persistUploadedFile(
    submissionId: string,
    originalName: string,
    buffer: Buffer,
  ) {
    const uploadsDir = this.getUploadsDirectoryPath();
    await mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(originalName) || '.bin';
    const baseName = path.basename(originalName, ext);
    const safeBaseName = this.sanitizeFilename(baseName) || 'document';
    const storedFileName = `${submissionId}-${Date.now()}-${safeBaseName}${ext}`;
    const storagePath = path.join(uploadsDir, storedFileName);

    await writeFile(storagePath, buffer);
    return storagePath;
  }

  async uploadDocument(
    submissionId: string,
    file: UploadedSubmissionFile,
    submissionFromGuard?: SubmissionDocument,
  ) {
    if (!isValidObjectId(submissionId)) {
      throw new BadRequestException('Invalid Submission ID format.');
    }

    if (!file?.buffer) {
      throw new BadRequestException('File is required.');
    }

    const submission =
      submissionFromGuard ?? (await this.findById(submissionId));

    // SECURITY: Validate Window (Missing from main, added from current PR)
    const phase = await this.phasesService.getPhaseById(submission.phaseId);
    if (!phase.submissionStart || !phase.submissionEnd) {
      throw new BadRequestException(
        'Phase submission window is not configured.',
      );
    }
    const now = new Date();
    if (now < phase.submissionStart) {
      throw new BadRequestException(
        'Submission window has not started yet. Upload is not permitted.',
      );
    }
    if (now >= phase.submissionEnd) {
      throw new BadRequestException(
        'Submission window has closed. Upload is not permitted.',
      );
    }

    // Prepare file information
    const decodedFileName = Buffer.from(file.originalname, 'latin1').toString(
      'utf8',
    );

    submission.documents = submission.documents || [];

    if (submission.documents.length >= MAX_DOCUMENTS_PER_SUBMISSION) {
      throw new BadRequestException(
        `Maximum document limit (${MAX_DOCUMENTS_PER_SUBMISSION}) reached.`,
      );
    }

    const storagePath = await this.persistUploadedFile(
      submissionId,
      decodedFileName,
      file.buffer,
    );
    const newDocument = {
      originalName: decodedFileName,
      mimeType: file.mimetype,
      uploadedAt: new Date(),
      storagePath,
    };

    submission.documents.push(newDocument as any);
    await submission.save();
    return {
      message: 'Document uploaded successfully.',
      document: newDocument,
    };
  }

  async getDocumentForDownload(
    submissionId: string,
    documentIndex: number,
    submissionFromGuard?: SubmissionDocument,
  ) {
    if (!isValidObjectId(submissionId)) {
      throw new BadRequestException('Invalid Submission ID format.');
    }

    if (!Number.isInteger(documentIndex) || documentIndex < 0) {
      throw new BadRequestException('Invalid document index.');
    }

    const submission =
      submissionFromGuard ?? (await this.findById(submissionId));
    const document = submission.documents?.[documentIndex];
    if (!document) {
      throw new NotFoundException('Document not found.');
    }

    if (!document.storagePath) {
      throw new NotFoundException('Document storage path not found.');
    }

    let buffer: Buffer;
    try {
      buffer = await readFile(document.storagePath);
    } catch {
      throw new NotFoundException('Stored file not found.');
    }

    return {
      originalName: document.originalName,
      mimeType: document.mimeType,
      buffer,
    };
  }

  async getCompleteness(submissionId: string) {
    const submission = await this.findById(submissionId);
    const phase = await this.phasesService.findByPhaseId(submission.phaseId);
    if (!phase) throw new NotFoundException('Phase not found.');

    const missingFields: string[] = [];
    const requiredFields = phase.requiredFields || [];

    for (const field of requiredFields) {
      if (field === 'documents') {
        if (!submission.documents || submission.documents.length === 0)
          missingFields.push('documents');
      } else {
        const value = submission.get(field);
        if (value === undefined || value === null || value === '')
          missingFields.push(field);
      }
    }

    

    return {
      submissionId,
      isComplete: missingFields.length === 0,
      missingFields,
      requiredFields,
      phaseId: submission.phaseId,
    };
  }

  async assertJuryMember(userId: string, groupId: string): Promise<void> {
    const committee = await this.committeeModel.findOne({ 'groups.groupId': groupId }).exec();
    
    if (!committee) {
      throw new NotFoundException('No committee assigned to this group.');
    }

    const isJury = committee.jury?.some((member: any) => String(member.userId) === String(userId));
    if (!isJury) {
      throw new ForbiddenException('You are not a jury member for this group.');
    }
  }


  async listSubmissionsForJury(userId: string, groupId: string) {
    await this.assertJuryMember(userId, groupId);

    // Mongoose projection ({ 'documents.storagePath': 0 })  with this we delete storage path safely from response
    return this.submissionModel
      .find({ groupId }, { 'documents.storagePath': 0 })
      .sort({ createdAt: -1 })
      .exec();
  }


   async getSubmissionForJury(userId: string, submissionId: string) {
    if (!isValidObjectId(submissionId)) {
      throw new BadRequestException('Invalid Submission ID format.');
    }

    const submission = await this.submissionModel
      .findById(submissionId, { 'documents.storagePath': 0 })
      .exec();

    if (!submission) {
      throw new NotFoundException('Submission not found.');
    }

    await this.assertJuryMember(userId, submission.groupId);
    return submission;
  }
}
