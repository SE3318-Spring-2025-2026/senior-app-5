import { ApiProperty } from '@nestjs/swagger';
import {
  SoftGrade,
  SprintEvaluationStatus,
  SprintEvaluationType,
} from '../schemas/sprint-evaluation.schema';

export class SprintEvaluationResponseItemDto {
  @ApiProperty({ format: 'uuid' })
  questionId!: string;

  @ApiProperty({ enum: SoftGrade })
  softGrade!: SoftGrade;
}

export class SprintEvaluationResponseDto {
  @ApiProperty({ format: 'uuid' })
  evaluationId!: string;

  @ApiProperty({ format: 'uuid' })
  groupId!: string;

  @ApiProperty({ format: 'uuid' })
  sprintId!: string;

  @ApiProperty({ format: 'uuid' })
  deliverableId!: string;

  @ApiProperty({ enum: SprintEvaluationType })
  evaluationType!: SprintEvaluationType;

  @ApiProperty({ format: 'uuid' })
  rubricId!: string;

  @ApiProperty({ type: [SprintEvaluationResponseItemDto] })
  responses!: SprintEvaluationResponseItemDto[];

  @ApiProperty({ example: 80 })
  averageScore!: number;

  @ApiProperty({ enum: SprintEvaluationStatus })
  status!: SprintEvaluationStatus;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
