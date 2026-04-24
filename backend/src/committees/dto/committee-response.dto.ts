import { ApiProperty } from '@nestjs/swagger';

export class JuryMemberResponse {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  name!: string;
}

export class CommitteeAdvisorResponse {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  name!: string;
}

export class CommitteeGroupResponse {
  @ApiProperty({ description: 'UUID of the assigned group' })
  groupId!: string;

  @ApiProperty({
    description: 'Timestamp when this group was assigned',
    type: String,
    format: 'date-time',
  })
  assignedAt!: Date;

  @ApiProperty({ description: 'ID of the user who made this assignment' })
  assignedByUserId!: string;
}

export class CommitteeResponseDto {
  @ApiProperty({ description: 'UUID of the committee' })
  id!: string;

  @ApiProperty({ description: 'Name of the committee' })
  name!: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp', nullable: true })
  updatedAt!: Date | null;

  @ApiProperty({ type: [JuryMemberResponse] })
  jury!: JuryMemberResponse[];

  @ApiProperty({ type: [CommitteeAdvisorResponse] })
  advisors!: CommitteeAdvisorResponse[];

  @ApiProperty({ type: [CommitteeGroupResponse] })
  groups!: CommitteeGroupResponse[];
}
