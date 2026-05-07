import { ApiProperty } from '@nestjs/swagger';

export class GradeHistoryEntryDto {
  @ApiProperty({ format: 'uuid' })
  gradeChangeId!: string;

  @ApiProperty({ format: 'uuid' })
  groupId!: string;

  @ApiProperty({ example: 78.4 })
  teamGrade!: number;

  @ApiProperty({ type: Object })
  gradeComponents!: Record<string, unknown>;

  @ApiProperty({ format: 'uuid' })
  triggeredBy!: string;

  @ApiProperty({ format: 'date-time' })
  changedAt!: Date;
}