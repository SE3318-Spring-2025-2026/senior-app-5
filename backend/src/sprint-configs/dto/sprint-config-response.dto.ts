import { ApiProperty } from '@nestjs/swagger';

export class SprintDeliverableMappingResponseDto {
  @ApiProperty({ format: 'uuid' })
  deliverableId!: string;

  @ApiProperty()
  contributionPercentage!: number;
}

export class SprintConfigResponseDto {
  @ApiProperty({ format: 'uuid' })
  sprintId!: string;

  @ApiProperty()
  targetStoryPoints!: number;

  @ApiProperty({ type: [SprintDeliverableMappingResponseDto] })
  deliverableMappings!: SprintDeliverableMappingResponseDto[];

  @ApiProperty({ description: 'True once the sprint has been finalized.' })
  isFinalized!: boolean;

  @ApiProperty({
    description: 'Friendly label derived from the linked Schedule date range.',
    nullable: true,
  })
  name!: string | null;

  @ApiProperty({ nullable: true })
  startDate!: Date | null;

  @ApiProperty({ nullable: true })
  endDate!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
