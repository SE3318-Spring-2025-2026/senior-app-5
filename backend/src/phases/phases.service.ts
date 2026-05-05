import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Phase, PhaseDocument } from './phase.entity';
import { UpdatePhaseScheduleDto } from './dto/update-phase-schedule.dto';

@Injectable()
export class PhasesService {
  constructor(
    @InjectModel(Phase.name) private phaseModel: Model<PhaseDocument>,
  ) {}

  async listForScheduling(): Promise<Phase[]> {
    return this.phaseModel
      .find()
      .select('phaseId submissionStart submissionEnd -_id')
      .sort({ phaseId: 1 })
      .exec();
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
