import { ApiProperty } from '@nestjs/swagger';

export class CommitteeListItemDto {
  @ApiProperty({ description: 'UUID of the committee' })
  id!: string;

  @ApiProperty({ description: 'Name of the committee' })
  name!: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp', nullable: true })
  updatedAt!: Date | null;
}

export class CommitteePageDto {
  @ApiProperty({ type: [CommitteeListItemDto] })
  data!: CommitteeListItemDto[];

  @ApiProperty({ description: 'Total number of matching committees' })
  total!: number;

  @ApiProperty({ description: 'Current page index (1-based)' })
  page!: number;

  @ApiProperty({ description: 'Page size' })
  limit!: number;
}
