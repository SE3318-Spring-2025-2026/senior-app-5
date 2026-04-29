import { ApiProperty } from '@nestjs/swagger';

export class StudentFinalGradeDto {
  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty({ format: 'uuid' })
  groupId!: string;

  @ApiProperty({ example: 0.9 })
  individualAllowanceRatio!: number;

  @ApiProperty({ example: 70.56 })
  finalGrade!: number;

  @ApiProperty({ format: 'date-time' })
  calculatedAt!: Date;
}