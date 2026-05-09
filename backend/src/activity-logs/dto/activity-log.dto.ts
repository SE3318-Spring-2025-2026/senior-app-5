import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActivityLogDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  timestamp!: Date;

  @ApiProperty()
  eventType!: string;

  @ApiPropertyOptional({ nullable: true })
  actorUserId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Resolved from User.name when actorUserId is set',
  })
  actorName?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Resolved from User.email when actorUserId is set',
  })
  actorEmail?: string | null;

  @ApiPropertyOptional({ nullable: true })
  actorRole?: string | null;

  @ApiPropertyOptional({ nullable: true })
  targetType?: string | null;

  @ApiPropertyOptional({ nullable: true })
  targetId?: string | null;

  @ApiProperty()
  summary!: string;

  @ApiPropertyOptional({ type: Object, nullable: true })
  metadata?: Record<string, unknown> | null;
}
