import { IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddMemberDto {
  @ApiProperty({
    example: '69e22c0a65cf84775acc127e',
    description: 'MongoDB ObjectId of the user to add to the group',
  })
  @IsNotEmpty()
  @IsMongoId()
  memberUserId!: string;
}

