import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class UpdatePhaseScheduleDto {
  
  @ApiProperty()
  
  @IsDateString()
  submissionStart!: string;

  @IsDateString()
  submissionEnd!: string;
}
