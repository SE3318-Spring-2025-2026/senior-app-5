import { ApiProperty } from '@nestjs/swagger';

export class CommitteeGroupResponseDto {
  @ApiProperty({ description: 'Group identifier', format: 'uuid' })
  groupId!: string;

  @ApiProperty({
    description: 'Assignment timestamp',
    format: 'date-time',
  })
  assignedAt!: Date;

  @ApiProperty({
    description: 'Coordinator ID who made this assignment',
    format: 'uuid',
  })
  assignedByUserId!: string;
}
