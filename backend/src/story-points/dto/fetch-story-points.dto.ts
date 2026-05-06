import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class FetchStoryPointsDto {
  @ApiPropertyOptional({
    description: 'Subset of student UUIDs to fetch; defaults to all group members',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  studentIds?: string[];
}
