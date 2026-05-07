import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class OverrideStoryPointsDto {
  @ApiProperty({ description: 'Override completed story points (must be >= 0)', minimum: 0 })
  @IsInt()
  @Min(0)
  completedPoints!: number;
}
