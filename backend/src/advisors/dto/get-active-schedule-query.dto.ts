import { IsEnum, IsOptional } from 'class-validator';
import { SchedulePhase } from '../schemas/schedule.schema';

export class GetActiveScheduleQueryDto {
  @IsOptional()
  @IsEnum(SchedulePhase)
  phase?: SchedulePhase;
}
