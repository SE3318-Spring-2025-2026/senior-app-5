import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GradingType, SprintRubricType } from '../schemas/rubric.schema';

export class CreateRubricQuestionDto {
  @ApiProperty({
    description: 'Descriptive name of the evaluation criteria',
    example: 'Code readability',
  })
  @IsString()
  criteriaName!: string;

  @ApiProperty({
    description:
      'Weight as a decimal (0–1). Sum of all questions must = 1.0.',
    example: 0.5,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  criteriaWeight!: number;
}

export class CreateRubricDto {
  @ApiPropertyOptional({
    description: 'The deliverable this rubric evaluates (mutually exclusive with sprintEvaluationType)',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  deliverableId?: string;

  @ApiPropertyOptional({
    description: 'Sprint evaluation type this rubric applies to (mutually exclusive with deliverableId)',
    enum: SprintRubricType,
  })
  @IsOptional()
  @IsEnum(SprintRubricType)
  sprintEvaluationType?: SprintRubricType;

  @ApiProperty({
    description: 'Human-readable name for this rubric version',
    example: 'Sprint SCRUM Evaluation',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Grading scale applied to all questions in this rubric',
    enum: GradingType,
    example: GradingType.SOFT,
  })
  @IsEnum(GradingType)
  gradingType!: GradingType;

  @ApiProperty({
    description: 'Array of evaluation criteria questions',
    type: [CreateRubricQuestionDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRubricQuestionDto)
  questions!: CreateRubricQuestionDto[];
}
