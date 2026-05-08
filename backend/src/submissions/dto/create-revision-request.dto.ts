import { IsISO8601, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRevisionRequestDto {
  @ApiProperty({ description: 'Due date for the revision in ISO8601 format' })
  @IsNotEmpty()
  @IsISO8601({ strict: true })
  revisionDueDatetime!: string;
}