import { IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ListRubricsQueryDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  @ApiProperty({
    example: false,
    description: 'If true, only return the active rubric',
    required: false,
    default: false,
  })
  activeOnly?: boolean;
}
