import {
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class QuestionInputDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: 'Code Quality',
    description: 'Name of the evaluation criteria',
  })
  criteriaName!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(1)
  @ApiProperty({
    example: 0.5,
    description:
      'Weight for this criteria (0 to 1). All criteria weights must sum to exactly 1.0.',
  })
  criteriaWeight!: number;
}

export class CreateRubricDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: 'Sprint 1 Evaluation Rubric',
    description: 'Name of the rubric',
  })
  name!: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionInputDto)
  @ApiProperty({
    type: QuestionInputDto,
    isArray: true,
    description: 'Array of evaluation criteria questions (minimum 1)',
    example: [
      {
        criteriaName: 'Code Quality',
        criteriaWeight: 0.5,
      },
      {
        criteriaName: 'Documentation',
        criteriaWeight: 0.5,
      },
    ],
  })
  questions!: QuestionInputDto[];
}
