import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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
  @ApiProperty({
    description: 'The deliverable this rubric evaluates',
    format: 'uuid',
  })
  @IsUUID()
  deliverableId!: string;

  @ApiProperty({
    description: 'Human-readable name for this rubric version',
    example: 'Sprint 1 SCRUM Evaluation',
  })
  @IsString()
  name!: string;

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
