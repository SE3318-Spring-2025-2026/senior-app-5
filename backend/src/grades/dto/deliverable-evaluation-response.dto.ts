import { ApiProperty } from '@nestjs/swagger';
import { DeliverableGrade } from '../schemas/deliverable-evaluation.schema';

export class DeliverableEvaluationResponseDto {
  @ApiProperty({ format: 'uuid' })
  evaluationId!: string;

  @ApiProperty({ format: 'uuid' })
  groupId!: string;

  @ApiProperty({ format: 'uuid' })
  deliverableId!: string;

  @ApiProperty({ enum: DeliverableGrade })
  deliverableGrade!: DeliverableGrade;

  @ApiProperty({ format: 'uuid' })
  gradedBy!: string;

  @ApiProperty({ nullable: true, description: 'Display name of the grader.' })
  gradedByName?: string | null;

  @ApiProperty({ nullable: true, description: 'Email of the grader.' })
  gradedByEmail?: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
