import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeliverInviteDto {
  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0851', description: 'UUID of the invite recipient user' })
  @IsNotEmpty()
  @IsString()
  recipientUserId: string;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0852', description: 'UUID of the group to invite the user to' })
  @IsNotEmpty()
  @IsString()
  groupId: string;
}
