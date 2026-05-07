import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

export class AddCommentDto {
  @ApiProperty({
    description: 'Comment text (1-2000 characters)',
    minLength: 1,
    maxLength: 2000,
    example: 'Please revise the introduction section for clarity.',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  commentText!: string;
}
