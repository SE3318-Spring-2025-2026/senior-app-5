import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateDeliverableDto {
  @ApiPropertyOptional({
    description: 'Updated contribution percentage toward the final grade (0–100). Total across all deliverables must not exceed 100.',
    example: 35,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  deliverablePercentage?: number;
}
