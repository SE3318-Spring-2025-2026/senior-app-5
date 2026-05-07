import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Phase, PhaseDocument } from './phase.entity';
import { CreatePhaseDto } from './dto/create-phase.dto';
import { UpdatePhaseScheduleDto } from './dto/update-phase-schedule.dto';

@Injectable()
export class PhasesService {
  constructor(
    @InjectModel(Phase.name) private phaseModel: Model<PhaseDocument>,
  ) {}

  async listForScheduling(field?: string, value?: string, limit?: number): Promise<Phase[]> {
    const query: Record<string, unknown> = {};

    if (field || value) {
      const allowedFields = new Set(['phaseId', 'name']);
      if (!field || !allowedFields.has(field)) {
        throw new BadRequestException(
          `Invalid field '${field}'. Allowed fields: phaseId, name.`,
        );
      }

      const rawValue = value?.trim();
      if (!rawValue) {
        return [];
      }

      query[field] =
        field === 'phaseId'
          ? rawValue
          : { $regex: rawValue, $options: 'i' };
    }

    return this.phaseModel
      .find(query)
      .select('phaseId name submissionStart submissionEnd -_id')
      .sort({ phaseId: 1 })
      .limit(limit ?? 50)
      .exec();
  }

  async createPhase(dto: CreatePhaseDto) {
    const phase = new this.phaseModel({
      name: dto.name,
      requiredFields: [],
    });

    return phase.save();
  }

  async findByPhaseId(phaseId: string): Promise<Phase> {
    const phase = await this.phaseModel.findOne({ phaseId }).exec();
    if (!phase) {
      throw new NotFoundException('Phase not found');
    }
    return phase;
  }

  async getPhaseById(phaseId: string) {
    const phase = await this.phaseModel.findOne({ phaseId }).exec();
    if (!phase) {
      throw new NotFoundException('Phase not found');
    }

    return phase;
  }

  async updateSchedule(phaseId: string, dto: UpdatePhaseScheduleDto) {
    const submissionStart = new Date(dto.submissionStart);
    const submissionEnd = new Date(dto.submissionEnd);

    if (submissionEnd <= submissionStart) {
      throw new BadRequestException(
        'submissionEnd must be strictly after submissionStart',
      );
    }

    const phase = await this.phaseModel.findOne({ phaseId }).exec();
    if (!phase) {
      throw new NotFoundException('Phase not found');
    }

    phase.submissionStart = submissionStart;
    phase.submissionEnd = submissionEnd;

    return phase.save();
  }
}
