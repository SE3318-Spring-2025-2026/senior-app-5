import { ApiProperty } from '@nestjs/swagger';

export class AddCommitteeAdvisorResponseDto {
  @ApiProperty({ format: 'uuid' })
  advisorId!: string;

  @ApiProperty({ enum: ['PRIMARY_ADVISOR', 'JURY_MEMBER'] })
  assignmentSource!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  assignedAt!: Date;

  @ApiProperty({ description: 'User ID of the coordinator who made this assignment', format: 'uuid' })
  assignedByUserId!: string;
}
