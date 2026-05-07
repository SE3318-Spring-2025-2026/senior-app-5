import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateDeliverableDto {
  @ApiProperty({
    description: 'Unique deliverable name',
    example: 'Statement of Work',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Top-level category weight in the final grade formula',
    example: 0.5,
    minimum: 0,
    maximum: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  categoryWeight!: number;

  @ApiProperty({
    description: 'Deliverable weight within its category',
    example: 0.35,
    minimum: 0,
    maximum: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  subWeight!: number;

  @ApiProperty({
    description: 'Overall contribution percentage of the deliverable',
    example: 17.5,
    minimum: 0,
    maximum: 100,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  deliverablePercentage!: number;
}
