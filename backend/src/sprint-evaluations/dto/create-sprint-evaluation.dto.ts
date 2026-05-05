import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SoftGrade, SprintEvaluationType } from '../schemas/sprint-evaluation.schema';

export class CreateSprintEvaluationResponseItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  questionId!: string;

  @ApiProperty({ enum: SoftGrade })
  @IsEnum(SoftGrade)
  softGrade!: SoftGrade;
}

export class CreateSprintEvaluationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  groupId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sprintId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  deliverableId!: string;

  @ApiProperty({ enum: SprintEvaluationType })
  @IsEnum(SprintEvaluationType)
  evaluationType!: SprintEvaluationType;

  @ApiProperty({ type: [CreateSprintEvaluationResponseItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSprintEvaluationResponseItemDto)
  responses!: CreateSprintEvaluationResponseItemDto[];
}
