import { IsNotEmpty, IsString } from 'class-validator';

export class DeliverInviteDto {
  @IsNotEmpty()
  @IsString()
  recipientUserId: string;

  @IsNotEmpty()
  @IsString()
  groupId: string;
}
