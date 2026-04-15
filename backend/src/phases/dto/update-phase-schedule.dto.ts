import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class UpdatePhaseScheduleDto {
  
  @ApiProperty()
  
  @IsDateString()
  submissionStart!: string;

  @ApiProperty()
  @IsDateString()
  submissionEnd!: string;
}
