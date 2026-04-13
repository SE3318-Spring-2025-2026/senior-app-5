import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateIntegrationsDto {
  @ApiProperty({ example: 'JIRA-123', description: 'Jira project key for the team' })
  @IsNotEmpty()
  @IsString()
  jiraProjectKey!: string;

  @ApiProperty({ example: 'my-github-repo', description: 'GitHub repository ID for the team' })
  @IsNotEmpty()
  @IsString()
  githubRepositoryId!: string;
}
