import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RespondToInviteDto {
  @ApiProperty({ example: true, description: 'true = accept the invite, false = reject it' })
  @IsBoolean()
  accept!: boolean;
}
