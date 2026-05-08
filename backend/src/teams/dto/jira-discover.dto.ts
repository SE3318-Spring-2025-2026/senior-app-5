import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class JiraDiscoverDto {
  @ApiProperty({ example: 'mycompany.atlassian.net' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.replace(/^https?:\/\//, '').replace(/\/$/, '').trim()
      : value,
  )
  jiraDomain!: string;

  @ApiProperty({ example: 'leader@mycompany.com' })
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) => value?.trim().toLowerCase())
  jiraEmail!: string;

  @ApiProperty({ example: 'ATATT3xFfGF0...' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  jiraApiToken!: string;

  @ApiPropertyOptional({ example: 'TES' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim().toUpperCase())
  jiraProjectKey?: string;
}
