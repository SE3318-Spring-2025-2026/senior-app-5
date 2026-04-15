import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class RemoveCommitteeGroupDto {
  @ApiProperty({
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
    description: 'Group id to remove from committee',
  })
  @IsUUID()
  @IsNotEmpty()
  groupId!: string;
}
