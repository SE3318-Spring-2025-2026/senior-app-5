import { IsEnum } from 'class-validator';
import { SchedulePhase } from '../schemas/schedule.schema';

export class GetActiveScheduleQueryDto {
  @IsEnum(SchedulePhase)
  phase!: SchedulePhase;
}
