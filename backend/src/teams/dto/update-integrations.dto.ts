import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEmail } from 'class-validator';
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
    description: 'GitHub repository ID for the team',
  })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  githubRepositoryId!: string;
}