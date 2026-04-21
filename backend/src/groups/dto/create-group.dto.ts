import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';
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
    example: '69e22c0a65cf84775acc127e',
    description: 'MongoDB ObjectId of the group leader user',
  })
  @IsNotEmpty()
  @IsMongoId()
  leaderUserId!: string;
}
