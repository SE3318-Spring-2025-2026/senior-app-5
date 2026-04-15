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
  @ApiProperty()
  groupId!: string;

  @ApiProperty()
  groupName!: string;
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
