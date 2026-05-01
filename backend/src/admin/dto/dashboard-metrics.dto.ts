import { ApiProperty } from '@nestjs/swagger';

export class DashboardMetricsDto {
  @ApiProperty()
  totalStudents!: number;

  @ApiProperty()
  activeGroups!: number;

  @ApiProperty()
  pendingAdvisorRequests!: number;

  @ApiProperty()
  unassignedGroups!: number;

  @ApiProperty()
  activityCountLast24h!: number;

  @ApiProperty({ enum: ['healthy', 'degraded'] })
  platformHealth!: 'healthy' | 'degraded';

  @ApiProperty()
  generatedAt!: string;
}