import { IsString, MaxLength } from 'class-validator';

export class AddCommentDto {
  @IsString()
  @MaxLength(2000)
  text!: string;
}
