import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class AddJuryMemberDto {
  @ApiProperty({
    description: 'MongoDB ObjectId of the user to assign as jury member',
  })
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  userId!: string;

  @ApiPropertyOptional({
    description: 'Optional assignment timestamp, defaults to current server time',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  assignedAt?: string;
}
