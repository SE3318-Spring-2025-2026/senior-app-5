import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

export class CreateDeliverableDto {
  @ApiProperty({
    description: 'Unique deliverable name',
    example: 'Statement of Work',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Contribution percentage toward the final grade (0–100). Must not cause the total across all deliverables to exceed 100.',
    example: 35,
    minimum: 0,
    maximum: 100,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  deliverablePercentage!: number;
}
