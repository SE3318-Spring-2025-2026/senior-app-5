import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateDeliverableMappingDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  deliverableId!: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  contributionPercentage!: number;
}

export class UpdateSprintConfigDto {
  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  targetStoryPoints?: number;

  @ApiPropertyOptional({ type: [UpdateDeliverableMappingDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateDeliverableMappingDto)
  deliverableMappings?: UpdateDeliverableMappingDto[];
}
