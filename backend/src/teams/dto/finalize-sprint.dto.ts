import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class FinalizeSprintDto {
  @ApiProperty({ description: 'Internal sprintId from SprintConfig' })
  @IsNotEmpty()
  @IsString()
  sprintId!: string;

  @ApiProperty({ description: 'Internal groupId linking to SprintConfig' })
  @IsNotEmpty()
  @IsString()
  groupId!: string;
}
