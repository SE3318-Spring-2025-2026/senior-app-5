import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export const MAX_MARKDOWN_BYTES = 1_000_000;

export class CreateMarkdownDocumentDto {
  @IsString()
  @IsNotEmpty()
  submissionId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(MAX_MARKDOWN_BYTES)
  contentMarkdown!: string;
}
