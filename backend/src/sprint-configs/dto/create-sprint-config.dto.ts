import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  IsNumber,
  ValidateNested,
} from 'class-validator';

export class DeliverableMappingDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Deliverable ID (must exist in D1)',
  })
  @IsUUID()
  deliverableId!: string;

  @ApiProperty({
    minimum: 0,
    maximum: 100,
    description: 'Contribution percentage (0–100)',
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  contributionPercentage!: number;
}

export class CreateSprintConfigDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Sprint ID — auto-generated if omitted. If provided, must exist in the Schedule API.',
  })
  @IsOptional()
  @IsUUID()
  sprintId?: string;

  @ApiProperty({
    minimum: 0,
    description: 'Target story points for this sprint',
  })
  @IsInt()
  @Min(0)
  targetStoryPoints!: number;

  @ApiProperty({ type: [DeliverableMappingDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DeliverableMappingDto)
  deliverableMappings!: DeliverableMappingDto[];
}
