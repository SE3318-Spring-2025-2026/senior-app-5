import { ApiProperty } from '@nestjs/swagger';

export class JuryMemberResponseDto {
  @ApiProperty({ description: 'Assigned jury user ID', format: 'uuid' })
  userId!: string;

  @ApiProperty({ description: 'Assignment timestamp', format: 'date-time' })
  assignedAt!: Date;

  @ApiProperty({
    description: 'Coordinator ID who created this assignment',
    format: 'uuid',
  })
  assignedByUserId!: string;
}
