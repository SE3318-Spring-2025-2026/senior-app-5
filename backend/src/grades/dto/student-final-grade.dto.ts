import { ApiProperty } from '@nestjs/swagger';

export class StudentFinalGradeDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Student identifier for the stored final grade',
  })
  studentId!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Group identifier associated with this grade',
  })
  groupId!: string;

  @ApiProperty({
    example: 0.9,
    description: 'Completed-to-target story point allowance ratio',
  })
  individualAllowanceRatio!: number;

  @ApiProperty({
    example: 70.56,
    description: 'Stored individual final grade for the student',
  })
  finalGrade!: number;

  @ApiProperty({
    format: 'date-time',
    description: 'Timestamp when the final grade was calculated',
  })
  calculatedAt!: Date;
}