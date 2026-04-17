import { IsMongoId, IsNotEmpty, IsOptional, IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCommitteeAdvisorRequest {
  @IsNotEmpty()
  @IsMongoId()
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'ID of the advisor user to link to the committee',
  })
  advisorUserId!: string;

  @IsOptional()
  @IsISO8601()
  @ApiProperty({
    example: '2026-04-17T10:30:00.000Z',
    description:
      'Timestamp when the advisor was assigned. Defaults to server time if not provided.',
    required: false,
  })
  assignedAt?: string;
}
