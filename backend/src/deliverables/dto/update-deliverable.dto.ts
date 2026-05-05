import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateDeliverableDto {
  @ApiPropertyOptional({
    description: 'Top-level category weight in the final grade formula',
    example: 0.5,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  categoryWeight?: number;

  @ApiPropertyOptional({
    description: 'Deliverable weight within its category',
    example: 0.35,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  subWeight?: number;

  @ApiPropertyOptional({
    description: 'Overall contribution percentage of the deliverable',
    example: 17.5,
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
