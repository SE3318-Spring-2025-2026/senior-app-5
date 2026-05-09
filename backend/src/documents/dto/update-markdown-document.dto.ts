import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { MAX_MARKDOWN_BYTES } from './create-markdown-document.dto';

export class UpdateMarkdownDocumentDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_MARKDOWN_BYTES)
  contentMarkdown?: string;
}
