import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class SetJiraAccountDto {
  @ApiProperty({
    example: '5b10a2844c20165700ede21g',
    description: 'JIRA Cloud accountId. Pass empty string to unlink.',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return '';
    // Strip ?cloudId=... or any querystring users sometimes paste from URL.
    return String(value).split('?')[0].trim();
  })
  jiraAccountId!: string;
}
