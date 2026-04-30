import { ApiProperty } from '@nestjs/swagger';

export class CommitteeAdvisorResponseDto {
  @ApiProperty({
    description: 'User ID of the advisor',
    format: 'uuid',
  })
  advisorUserId!: string;

  @ApiProperty({
    description: 'Timestamp when this advisor was assigned',
    format: 'date-time',
  })
  assignedAt!: Date;

  @ApiProperty({
    description: 'Coordinator ID who made this assignment',
    format: 'uuid',
  })
  assignedByUserId!: string;
}
