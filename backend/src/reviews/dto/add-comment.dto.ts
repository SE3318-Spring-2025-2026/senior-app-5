import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class AddCommentDto {
  @ApiProperty({
    description: 'Reviewer comment text',
    example: 'Please clarify the methodology section.',
    maxLength: 2000,
  })
  @IsString()
  @MaxLength(2000)
  text!: string;
}
