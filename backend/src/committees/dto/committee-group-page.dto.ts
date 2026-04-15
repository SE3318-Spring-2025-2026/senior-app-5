import { ApiProperty } from '@nestjs/swagger';

export class CommitteeGroupListItemDto {
  @ApiProperty({ description: 'UUID of the assigned group' })
  groupId!: string;

  @ApiProperty({ description: 'Timestamp when this group was assigned', type: String, format: 'date-time' })
  assignedAt!: Date;

  @ApiProperty({ description: 'ID of the user who made this assignment' })
  assignedByUserId!: string;
}

export class CommitteeGroupPageDto {
  @ApiProperty({ type: [CommitteeGroupListItemDto] })
  data!: CommitteeGroupListItemDto[];

  @ApiProperty({ description: 'Total number of group assignments for this committee' })
  total!: number;

  @ApiProperty({ description: 'Current page index (1-based)' })
  page!: number;

  @ApiProperty({ description: 'Page size' })
  limit!: number;
}
