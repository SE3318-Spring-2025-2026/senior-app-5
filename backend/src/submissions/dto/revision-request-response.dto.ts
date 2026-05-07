import { ApiProperty } from '@nestjs/swagger';

export class RevisionRequestResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the revision request',
    format: 'uuid',
  })
  revisionRequestId!: string;

  @ApiProperty({
    description: 'User ID of the person who requested the revision',
    format: 'uuid',
  })
  requesterUserId!: string;

  @ApiProperty({
    description: 'Due date/time for the revised proposal',
    format: 'date-time',
  })
  revisionDueDatetime!: Date;

  @ApiProperty({
    description: 'Current status of the revision request',
    enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
  })
  status!: string;

  @ApiProperty({
    description: 'Timestamp when the revision request was created',
    format: 'date-time',
  })
  createdAt!: Date;
}
