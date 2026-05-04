import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class CalculateGradeDto {
  @ApiProperty({
    description:
      'When false (default), returns 409 if a final grade already exists. ' +
      'When true, recalculates and overwrites D4; a new snapshot is always appended to D5.',
    default: false,
  })
  @IsBoolean()
  force!: boolean;
}
