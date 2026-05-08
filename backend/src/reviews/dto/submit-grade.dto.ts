import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

export class SubmitGradeDto {
  @ApiProperty({
    description: 'Numeric grade assigned by the reviewer',
    example: 85,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  grade!: number;
}
