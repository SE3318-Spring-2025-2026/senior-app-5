import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddGroupMemberDto {
  @ApiProperty({
    example: 'user-123',
    description: 'User ID of the member to add to the group',
  })
  @IsNotEmpty()
  @IsString()
  memberUserId!: string;
}
