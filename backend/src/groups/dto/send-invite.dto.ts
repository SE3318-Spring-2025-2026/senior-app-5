import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendInviteDto {
  @ApiProperty({ example: 'student@example.com', description: 'Email of the student to invite' })
  @IsEmail()
  @IsNotEmpty()
  invitedUserEmail!: string;
}
