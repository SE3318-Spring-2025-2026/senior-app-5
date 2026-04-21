import { IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeliverInviteDto {
  @ApiProperty({
    example: '69e22c0a65cf84775acc127e',
    description: 'MongoDB ObjectId of the invite recipient user',
  })
  @IsNotEmpty()
  @IsMongoId()
  recipientUserId: string;

  @ApiProperty({
    example: '69e22c0a65cf84775acc127f',
    description: 'MongoDB ObjectId of the group to invite the user to',
  })
  @IsNotEmpty()
  @IsMongoId()
  groupId: string;
}
