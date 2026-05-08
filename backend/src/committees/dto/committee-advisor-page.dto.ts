import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CommitteeAdvisorListItemDto {
  @ApiProperty({ description: 'User ID of the advisor' })
  advisorUserId!: string;

  @ApiPropertyOptional({ description: 'Email address of the advisor' })
  email?: string;

  @ApiProperty({
    description: 'Timestamp when this advisor was assigned',
    type: String,
    format: 'date-time',
  })
  assignedAt!: Date;
}

export class CommitteeAdvisorPageDto {
  @ApiProperty({ type: [CommitteeAdvisorListItemDto] })
  data!: CommitteeAdvisorListItemDto[];

  @ApiProperty({
    description: 'Total number of advisor assignments for this committee',
  })
  total!: number;

  @ApiProperty({ description: 'Current page index (1-based)' })
  page!: number;

  @ApiProperty({ description: 'Page size' })
  limit!: number;
}
