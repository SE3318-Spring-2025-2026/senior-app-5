import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
