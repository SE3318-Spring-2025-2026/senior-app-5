import { ApiProperty } from '@nestjs/swagger';
import { StudentFinalGradeDto } from './student-final-grade.dto';

export class GroupFinalGradeDto {
  @ApiProperty({ format: 'uuid' })
  groupId!: string;

  @ApiProperty({ example: 78.4 })
  teamGrade!: number;

  @ApiProperty({ type: [StudentFinalGradeDto] })
  individualGrades!: StudentFinalGradeDto[];

  @ApiProperty({ format: 'date-time' })
  calculatedAt!: Date;
}