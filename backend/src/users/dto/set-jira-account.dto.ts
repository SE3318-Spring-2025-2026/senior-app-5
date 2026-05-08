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
  @Transform(({ value }) => value?.trim() ?? '')
  jiraAccountId!: string;
}
