import { IsString, IsNotEmpty } from 'class-validator';

export class AddMemberDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
