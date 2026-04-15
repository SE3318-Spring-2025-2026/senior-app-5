import { IsDateString, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SchedulePhase } from '../schedule.schema';

export class SetScheduleDto {
  @ApiProperty({ enum: SchedulePhase, enumName: 'SchedulePhase' })
  @IsEnum(SchedulePhase)
  @IsNotEmpty()
  phase!: SchedulePhase;

  @ApiProperty({ description: 'Schedule window start (ISO 8601 date-time)' })
  @IsDateString()
  @IsNotEmpty()
  startDatetime!: string;

  @ApiProperty({ description: 'Schedule window end (ISO 8601 date-time)' })
  @IsDateString()
  @IsNotEmpty()
  endDatetime!: string;
}
