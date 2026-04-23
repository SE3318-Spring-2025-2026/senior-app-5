import { ApiProperty } from '@nestjs/swagger';

export class JuryMemberResponseDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  userId: string;

  @ApiProperty({
    example: '2026-04-16T10:30:00.000Z',
  })
  assignedAt: Date;
}
