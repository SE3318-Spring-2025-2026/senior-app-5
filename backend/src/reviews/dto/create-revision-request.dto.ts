import { IsDateString, IsString } from 'class-validator';

export class CreateRevisionRequestDto {
  @IsString()
  description!: string;

  @IsDateString()
  dueDatetime!: string;
}
