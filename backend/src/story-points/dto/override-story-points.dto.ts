import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class OverrideStoryPointsDto {
  @ApiProperty({ description: 'UUID of the student to override' })
  @IsUUID('4')
  studentId!: string;

  @ApiProperty({ description: 'Override completed story points (must be >= 0)', minimum: 0 })
  @IsInt()
  @Min(0)
  completedPoints!: number;
}
