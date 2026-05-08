import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString } from 'class-validator';

export class CreateRevisionRequestDto {
  @ApiProperty({
    description: 'Revision instructions for the student team',
    example: 'Please upload a revised proposal with the missing risk analysis.',
  })
  @IsString()
  description!: string;

  @ApiProperty({
    description: 'ISO-8601 deadline for the requested revision',
    example: '2026-06-01T12:00:00.000Z',
    format: 'date-time',
  })
  @IsDateString()
  dueDatetime!: string;
}
