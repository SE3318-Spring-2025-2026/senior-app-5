import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class PasswordResetRequestDto {
  @ApiProperty({ description: 'The email address associated with the account' })
  @IsEmail()
  email!: string;
}
