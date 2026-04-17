import { ApiProperty } from '@nestjs/swagger';

export class CommitteeAdvisorResponse {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'ID of the advisor user linked to the committee',
  })
  advisorUserId: string;

  @ApiProperty({
    example: '2026-04-17T10:30:00.000Z',
    description: 'Timestamp when the advisor was assigned to the committee',
  })
  assignedAt: Date;

  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'ID of the coordinator who assigned the advisor',
  })
  assignedByUserId: string;
}
