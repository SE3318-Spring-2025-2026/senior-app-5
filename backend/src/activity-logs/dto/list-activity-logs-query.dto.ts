import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListActivityLogsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ description: 'Exact-match event type filter' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  eventType?: string;

  @ApiPropertyOptional({
    description: 'Filter by actor user id (Mongo ObjectId)',
  })
  @IsOptional()
  @IsMongoId()
  actorUserId?: string;

  @ApiPropertyOptional({ description: 'Inclusive lower bound (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Inclusive upper bound (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ description: 'Substring filter on action summary' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
