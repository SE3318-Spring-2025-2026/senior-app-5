import { ApiProperty } from '@nestjs/swagger';

export class QuestionResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the question',
  })
  questionId!: string;

  @ApiProperty({
    example: 'Code Quality',
    description: 'Name of the evaluation criteria',
  })
  criteriaName!: string;

  @ApiProperty({
    example: 0.5,
    description: 'Weight for this criteria',
  })
  criteriaWeight!: number;
}

export class RubricResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the rubric',
  })
  rubricId!: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'Unique identifier for the deliverable',
  })
  deliverableId!: string;

  @ApiProperty({
    example: 'Sprint 1 Evaluation Rubric',
    description: 'Name of the rubric',
  })
  name!: string;

  @ApiProperty({
    example: true,
    description: 'Indicates if this is the active rubric for the deliverable',
  })
  isActive!: boolean;

  @ApiProperty({
    type: QuestionResponseDto,
    isArray: true,
    description: 'Array of evaluation criteria questions',
  })
  questions!: QuestionResponseDto[];

  @ApiProperty({
    example: '2026-04-23T10:30:00.000Z',
    description: 'Timestamp when the rubric was created',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-04-23T10:30:00.000Z',
    description: 'Timestamp when the rubric was last updated',
  })
  updatedAt!: Date;
}
