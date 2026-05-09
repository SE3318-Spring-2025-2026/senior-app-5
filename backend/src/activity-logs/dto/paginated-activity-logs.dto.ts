import { ApiProperty } from '@nestjs/swagger';
import { ActivityLogDto } from './activity-log.dto';

export class PaginatedActivityLogsDto {
  @ApiProperty({ type: [ActivityLogDto] })
  data!: ActivityLogDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}
