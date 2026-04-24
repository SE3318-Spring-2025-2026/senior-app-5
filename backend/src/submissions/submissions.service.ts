import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Role } from '../auth/enums/role.enum';
import { Group, GroupDocument, GroupStatus } from '../groups/group.entity';
import { PhasesService } from '../phases/phases.service';
import { User, UserDocument } from '../users/data/user.schema';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { Submission, SubmissionDocument } from './schemas/submission.schema';

type SubmissionActor = {
  userId?: string;
  role?: string;
  groupId?: string; 
};

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(Submission.name)
    private submissionModel: Model<SubmissionDocument>,
    @InjectModel(Group.name)
    private groupModel: Model<GroupDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private readonly phasesService: PhasesService,
  ) {}

  async assertAuthorizedGroupMember(
    actor: SubmissionActor,
    groupId: string,
  ): Promise<void> {
    if (actor.role === Role.Admin || actor.role === Role.Coordinator) {
      return;
    }

    const group = await this.groupModel.findOne({ groupId }).exec();
    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found.`);
    }

    if (group.status !== GroupStatus.ACTIVE) {
      throw new ForbiddenException('Grup aktif değil, işlem yapılamaz.');
    }

    
    if (String(actor.groupId) !== String(groupId)) {
      throw new ForbiddenException('Bu grup için işlem yapmaya yetkiniz yok.');
    }
  }

  async findById(submissionId: string): Promise<SubmissionDocument> {
    if (!isValidObjectId(submissionId)) {
      throw new NotFoundException('Geçersiz Submission ID.');
    }
    const submission = await this.submissionModel.findById(submissionId).exec();
    if (!submission) {
      throw new NotFoundException(`Submission bulunamadı.`);
    }
    return submission;
  }

  async createSubmission(createSubmissionDto: CreateSubmissionDto) {
    const phase = await this.phasesService.findByPhaseId(createSubmissionDto.phaseId);

    if (!phase.submissionStart || !phase.submissionEnd) {
      throw new BadRequestException('Bu faz için teslimat süresi ayarlanmamış.');
    }

    const now = new Date();
    if (now < phase.submissionStart || now > phase.submissionEnd) {
      throw new BadRequestException('Teslimat süresi dışındasınız.');
    }

    const submission = new this.submissionModel({
      ...createSubmissionDto,
      submittedAt: now,
    });

    return submission.save();
  }

  
  async findAll(groupId?: string) {
    
    if (!groupId) {
      return [];
    }
    return this.submissionModel.find({ groupId }).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<SubmissionDocument> {
    return this.findById(id);
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
      message: 'Belge başarıyla yüklendi.',
      document: newDocument,
    };
  }

  async getCompleteness(submissionId: string) {
    const submission = await this.findById(submissionId);
    const phase = await this.phasesService.findByPhaseId(submission.phaseId);

    if (!phase) {
      throw new NotFoundException(`Faz bulunamadı.`);
    }

    const missingFields: string[] = [];
    const requiredFields = phase.requiredFields || [];

    for (const field of requiredFields) {
      if (field === 'documents') {
        if (!submission.documents || submission.documents.length === 0) {
          missingFields.push('documents');
        }
      } else {
        const value = submission.get(field);
        if (value === undefined || value === null || value === '') {
          missingFields.push(field);
        }
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
}