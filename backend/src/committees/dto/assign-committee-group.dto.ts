import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class AssignCommitteeGroupDto {
  @ApiProperty({
    description: 'Identifier of the group to assign',
    format: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  groupId!: string;

  @ApiPropertyOptional({
    description: 'Optional assignment timestamp, defaults to current server time',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  assignedAt?: string;
}
