import { IsDateString, IsEnum } from 'class-validator';
import { SchedulePhase } from '../schemas/schedule.schema';

export class SetScheduleDto {
  @IsEnum(SchedulePhase)
  phase!: SchedulePhase;

  @IsDateString()
  startDatetime!: string;

  @IsDateString()
  endDatetime!: string;
}
