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

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
