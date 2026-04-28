import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class AddGroupMemberDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'MongoDB ObjectId of the user to add to the group',
  })
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  memberUserId!: string;
}
