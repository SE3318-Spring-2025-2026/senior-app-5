import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class AddJuryMemberDto {
  @ApiProperty({
    description: 'ID of the user to assign as jury member',
    format: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({
    description: 'Optional assignment timestamp, defaults to current server time',
import { IsDateString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class AddJuryMemberDto {
  @ApiProperty({ description: 'User ID of the jury member to add', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiPropertyOptional({
    description: 'Optional assignment timestamp; defaults to current server time',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  assignedAt?: string;
}
