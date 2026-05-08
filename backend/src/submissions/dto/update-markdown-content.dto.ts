import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateMarkdownContentDto {
  @ApiProperty({ description: 'Raw markdown string for the submission document' })
  @IsString()
  markdownContent!: string;
}
