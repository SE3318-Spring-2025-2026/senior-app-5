import { ApiProperty } from '@nestjs/swagger';
import { StudentFinalGradeDto } from './student-final-grade.dto';

export class GroupFinalGradeDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Group identifier for the stored final grade',
  })
  groupId!: string;

  @ApiProperty({
    example: 78.4,
    description: 'Stored final team grade from D4',
  })
  teamGrade!: number;

  @ApiProperty({
    type: [StudentFinalGradeDto],
    description: 'Individual stored grades for students in the group',
  })
  individualGrades!: StudentFinalGradeDto[];

  @ApiProperty({
    format: 'date-time',
    description: 'Timestamp when this final grade was calculated',
  })
  calculatedAt!: Date;
}