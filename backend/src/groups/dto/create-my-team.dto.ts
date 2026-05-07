import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMyTeamDto {
  @ApiProperty({ example: 'Team Alpha', description: 'Name of the new team' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  groupName!: string;
}
