import { IsDateString } from 'class-validator';

export class UpdateScheduleTimesDto {
  @IsDateString()
  startDatetime!: string;

  @IsDateString()
  endDatetime!: string;
}
