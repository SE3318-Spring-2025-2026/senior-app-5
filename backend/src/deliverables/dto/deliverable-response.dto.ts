import { ApiProperty } from '@nestjs/swagger';

export class DeliverableResponseDto {
  @ApiProperty({ description: 'UUID of the deliverable' })
  deliverableId!: string;

  @ApiProperty({ description: 'Unique deliverable name' })
  name!: string;

  @ApiProperty({ description: 'Contribution percentage toward the final grade (0–100)' })
  deliverablePercentage!: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp', nullable: true })
  updatedAt!: Date | null;
}

export class PaginatedDeliverablesDto {
  @ApiProperty({ type: [DeliverableResponseDto] })
  data!: DeliverableResponseDto[];

  @ApiProperty({ description: 'Total number of matching deliverables' })
  total!: number;

  @ApiProperty({ description: 'Current page index (1-based)' })
  page!: number;

  @ApiProperty({ description: 'Page size' })
  limit!: number;
}
