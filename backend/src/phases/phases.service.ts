import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Phase, PhaseDocument } from './phase.entity';

@Injectable()
export class PhasesService {
  constructor(
    @InjectModel(Phase.name) private phaseModel: Model<PhaseDocument>,
  ) {}

  async findByPhaseId(phaseId: string): Promise<Phase> {
    const phase = await this.phaseModel.findOne({ phaseId }).exec();

    if (!phase) {
      throw new NotFoundException('Phase not found');
    }

    return phase;
  }
}
