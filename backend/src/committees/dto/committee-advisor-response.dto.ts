import { ApiProperty } from '@nestjs/swagger';

export class CommitteeAdvisorResponseDto {
  @ApiProperty({ description: 'User ID of the advisor', format: 'uuid' })
  advisorUserId!: string;

  @ApiProperty({
    description: 'Timestamp when this advisor was assigned',
    type: String,
    format: 'date-time',
  })
  assignedAt!: Date;

  @ApiProperty({
    description: 'User ID of the coordinator who assigned the advisor',
    format: 'uuid',
  })
  assignedByUserId!: string;
}
