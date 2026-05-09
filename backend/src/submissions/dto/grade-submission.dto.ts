import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class GradeSubmissionDto {
  @ApiProperty({ description: 'Numeric grade 0–100', example: 85 })
  @IsNotEmpty()
  @IsNumber()
  gradeValue!: number;
}