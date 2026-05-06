import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class AddCommitteeAdvisorDto {
  @ApiProperty({
    description: 'Identifier of the advisor to link',
    format: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  advisorUserId!: string;

  @ApiPropertyOptional({
    description: 'Optional assignment timestamp, defaults to current server time',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  assignedAt?: string;
}
