import { ApiProperty } from '@nestjs/swagger';
import { StudentFinalGradeDto } from './student-final-grade.dto';

export class ScaledDeliverableGradeDto {
  @ApiProperty({ format: 'uuid', description: 'Deliverable identifier' })
  deliverableId!: string;

  @ApiProperty({
    example: 80,
    description: 'Raw numeric grade from committee evaluation (100/80/60/50/0)',
  })
  rawGrade!: number;

  @ApiProperty({
    example: 0.8,
    description:
      'Team scalar [0–1]: average of all sprint evaluation scores for sprints mapped to this deliverable, divided by 100',
  })
  teamScalar!: number;

  @ApiProperty({
    example: 0.5,
    description: 'Category weight from D1 deliverable config',
  })
  categoryWeight!: number;

  @ApiProperty({
    example: 0.35,
    description: 'Sub-weight from D1 deliverable config',
  })
  subWeight!: number;

  @ApiProperty({
    example: 22.4,
    description: 'Scaled grade: rawGrade × teamScalar × categoryWeight × subWeight',
  })
  scaledGrade!: number;
}

export class GradeCalculationResultDto {
  @ApiProperty({ format: 'uuid', description: 'Group identifier' })
  groupId!: string;

  @ApiProperty({
    example: 74.88,
    description: 'Sum of all scaled deliverable grades, capped at 100',
  })
  teamGrade!: number;

  @ApiProperty({
    example: 0.815,
    description: 'Overall team scalar: average of per-deliverable scalars',
  })
  teamScalar!: number;

  @ApiProperty({
    type: [ScaledDeliverableGradeDto],
    description: 'Breakdown of scaled grades per deliverable',
  })
  scaledDeliverableGrades!: ScaledDeliverableGradeDto[];

  @ApiProperty({
    type: [StudentFinalGradeDto],
    description: 'Final grades per student (teamGrade × individualAllowanceRatio)',
  })
  individualGrades!: StudentFinalGradeDto[];

  @ApiProperty({
    format: 'uuid',
    description: 'userId of the coordinator who triggered the calculation',
  })
  triggeredBy!: string;

  @ApiProperty({ format: 'date-time', description: 'Timestamp of calculation' })
  calculatedAt!: Date;
}
