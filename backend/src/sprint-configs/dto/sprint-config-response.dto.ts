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

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
