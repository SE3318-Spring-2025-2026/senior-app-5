import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class PasswordResetConfirmDto {
  @ApiProperty({ description: 'The password reset token received by email or from the reset flow' })
  @IsString()
  token!: string;

  @ApiProperty({ description: 'The new password for the account' })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
