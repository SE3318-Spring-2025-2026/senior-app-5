import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Schedule, ScheduleDocument, SchedulePhase } from './schedule.schema';
import { SetScheduleDto } from './dto/set-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectModel(Schedule.name)
    private readonly scheduleModel: Model<ScheduleDocument>,
  ) {}

  async create(dto: SetScheduleDto, coordinatorId: string) {
    const start = new Date(dto.startDatetime);
    const end = new Date(dto.endDatetime);

    if (end <= start) {
      throw new BadRequestException(
        'endDatetime must be strictly after startDatetime',
      );
    }

    await this.scheduleModel
      .updateMany({ phase: dto.phase, superseded: false }, { superseded: true })
      .exec();

    const schedule = await this.scheduleModel.create({
      coordinatorId,
      phase: dto.phase,
      startDatetime: start,
      endDatetime: end,
    });

    return this.toResponse(schedule);
  }

  async getActive(phase: SchedulePhase) {
    const schedule = await this.scheduleModel
      .findOne({ phase, superseded: false })
      .sort({ createdAt: -1 })
      .exec();

    if (!schedule) {
      throw new NotFoundException(
        `No active schedule found for phase: ${phase}`,
      );
    }

    const now = new Date();
    const isOpen =
      now >= schedule.startDatetime && now <= schedule.endDatetime;

    return {
      scheduleId: schedule.scheduleId,
      coordinatorId: schedule.coordinatorId,
      phase: schedule.phase,
      startDatetime: schedule.startDatetime,
      endDatetime: schedule.endDatetime,
      isOpen,
      createdAt: (schedule as any).createdAt,
    };
  }

  private toResponse(schedule: ScheduleDocument) {
    return {
      scheduleId: schedule.scheduleId,
      coordinatorId: schedule.coordinatorId,
      phase: schedule.phase,
      startDatetime: schedule.startDatetime,
      endDatetime: schedule.endDatetime,
      createdAt: (schedule as any).createdAt,
    };
  }
}
