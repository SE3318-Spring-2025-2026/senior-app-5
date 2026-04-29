import { ApiProperty } from '@nestjs/swagger';
import { GradeHistoryEntryDto } from './grade-history-entry.dto';

export class PaginatedGradeHistoryDto {
  @ApiProperty({ type: [GradeHistoryEntryDto] })
  data!: GradeHistoryEntryDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
