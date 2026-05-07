import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty } from 'class-validator';

export class CreateRevisionRequestDto {
  @ApiProperty({
    description: 'ISO 8601 datetime string for when the revised proposal is due',
    format: 'date-time',
    example: '2025-06-15T18:00:00.000Z',
  })
  @IsNotEmpty()
  @IsISO8601()
  revisionDueDatetime!: string;
}
