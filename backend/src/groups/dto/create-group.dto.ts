import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateGroupDto {
  @IsNotEmpty()
  @IsString()
  groupName!: string;

  @IsNotEmpty()
  @IsUUID()
  leaderUserId!: string;
}
