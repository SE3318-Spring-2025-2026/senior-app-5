import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateIntegrationsDto {
  @ApiProperty({
    example: 'JIRA-123',
    description: 'Jira project key for the team',
  })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  jiraProjectKey!: string;

  @ApiProperty({
    example: 'mycompany.atlassian.net',
    description: 'Jira domain for the team',
  })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => {
    if (!value) return value;
    
    return value.replace(/^https?:\/\//, '').replace(/\/$/, '').trim();
  })
  jiraDomain!: string;

  @ApiProperty({
    example: 'leader@mycompany.com',
    description: 'Email associated with the Jira API token',
  })
  @IsNotEmpty()
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  jiraEmail!: string;

  @ApiProperty({
    example: 'ATATT3xFfGF0...',
    description: 'Jira API token for authentication',
  })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  jiraApiToken!: string;

  @ApiProperty({
    example: 'my-github-repo',
    description: 'GitHub repository ID in owner/repo format',
  })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  githubRepositoryId!: string;

  @ApiPropertyOptional({
    example: 'ghp_xxxxxxxxxxxxxxxxxxxx',
    description: 'GitHub Personal Access Token (PAT) with read:repo access. Required for branch/PR verification.',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  githubToken?: string;

  @ApiPropertyOptional({
    example: '42',
    description:
      'Numeric JIRA board id. When set, the system uses /rest/agile/1.0/board/{boardId}/sprint?state=active to resolve the team\'s active sprint instead of JQL search.',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toString().trim())
  jiraBoardId?: string;

  @ApiPropertyOptional({
    example: 'a3f1c8de-...-uuid',
    description:
      'Cohort/group id this team belongs to. Required for the auto-finalize cron to compute per-student points without manual coordinator action.',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  groupId?: string;

  @ApiPropertyOptional({
    example: 'customfield_10016',
    description:
      "Custom field id Jira uses for Story Points on this team's instance. Defaults to customfield_10016 (Jira Cloud default).",
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  jiraStoryPointsField?: string;
}