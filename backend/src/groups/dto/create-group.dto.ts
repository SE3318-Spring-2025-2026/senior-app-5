import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({
    example: 'Student project group',
    description: 'Name of the group',
  })
  @IsNotEmpty()
  @IsString()
  groupName!: string;

  @ApiProperty({
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
    description: 'UUID of the group leader user',
  })
  @IsNotEmpty()
  @IsUUID()
  leaderUserId!: string;
}
