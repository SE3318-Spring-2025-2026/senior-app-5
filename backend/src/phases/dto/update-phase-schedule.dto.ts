import { IsDateString } from 'class-validator';

export class UpdatePhaseScheduleDto {
  @IsDateString()
  submissionStart!: string;

  @IsDateString()
  submissionEnd!: string;
}
