import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class UpdatePhaseScheduleDto {
  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  submissionStart!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  submissionEnd!: string;
}
