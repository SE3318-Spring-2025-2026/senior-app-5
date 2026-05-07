import { ApiProperty } from '@nestjs/swagger';

export class JuryMemberResponseDto {
  @ApiProperty({ description: 'User ID of the jury member', format: 'uuid' })
  userId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  assignedAt!: Date;

  @ApiProperty({ description: 'User ID of the coordinator who made this assignment', format: 'uuid' })
  assignedByUserId!: string;
}
