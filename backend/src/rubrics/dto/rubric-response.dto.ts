import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class RubricQuestionResponseDto {
  @ApiProperty({ format: 'uuid' })
  questionId!: string;

  @ApiProperty()
  criteriaName!: string;

  @ApiProperty({ example: 0.5 })
  criteriaWeight!: number;
}

export class RubricResponseDto {
  @ApiProperty({ format: 'uuid' })
  rubricId!: string;

  @ApiProperty({ format: 'uuid' })
  deliverableId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: [RubricQuestionResponseDto] })
  questions!: RubricQuestionResponseDto[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  updatedAt!: Date | null;
}

export class PaginatedRubricsDto {
  @ApiProperty({ type: [RubricResponseDto] })
  data!: RubricResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

export class ListRubricsQueryDto {
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
}
