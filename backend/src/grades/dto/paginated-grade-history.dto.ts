import { ApiProperty } from '@nestjs/swagger';
import { GradeHistoryEntryDto } from './grade-history-entry.dto';

export class PaginatedGradeHistoryDto {
  @ApiProperty({
    type: [GradeHistoryEntryDto],
    description: 'Grade history entries for the requested group page',
  })
  data!: GradeHistoryEntryDto[];

  @ApiProperty({ description: 'Total number of grade history entries' })
  total!: number;

  @ApiProperty({ description: 'Current page number' })
  page!: number;

  @ApiProperty({ description: 'Requested page size' })
  limit!: number;
}
