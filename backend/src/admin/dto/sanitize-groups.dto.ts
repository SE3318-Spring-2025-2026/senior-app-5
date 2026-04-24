import { IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SanitizeGroupsDto {
  @ApiProperty({ example: '2024-05-01T00:00:00.000Z', description: 'The ISO8601 deadline date' })
  @IsNotEmpty()
  @IsDateString() 
  sanitizationRunDateTime: string;
}