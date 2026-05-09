import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdvisorGradingScopeItemDto {
  @ApiProperty({ description: 'ID of the group this advisor must grade' })
  groupId!: string;

  @ApiPropertyOptional({
    description: 'Display name of the group (joined from Group collection).',
    nullable: true,
  })
  groupName?: string | null;

  @ApiProperty({ type: String, format: 'date-time', description: 'When the group was assigned to the committee' })
  assignedAt!: Date;

  @ApiProperty({ description: 'True if this group is directly advised by this advisor' })
  isOwnGroup!: boolean;

  @ApiPropertyOptional({
    description: 'The primary advisor of this group; null when isOwnGroup is true',
    nullable: true,
  })
  originalAdvisorUserId!: string | null;
}

export class AdvisorGradingScopePageDto {
  @ApiProperty({ type: [AdvisorGradingScopeItemDto] })
  data!: AdvisorGradingScopeItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
