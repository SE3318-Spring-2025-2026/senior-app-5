import { ApiProperty } from '@nestjs/swagger';
import { IsEmpty, IsEnum, IsUUID } from 'class-validator';
import { DeliverableGrade } from '../schemas/deliverable-evaluation.schema';

export class CreateDeliverableEvaluationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  groupId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  deliverableId!: string;

  @ApiProperty({ enum: DeliverableGrade })
  @IsEnum(DeliverableGrade)
  deliverableGrade!: DeliverableGrade;

  @ApiProperty({
    required: false,
    readOnly: true,
    description: 'Must not be provided by client. It is extracted from JWT.',
  })
  @IsEmpty({ message: 'gradedBy must not be provided in request body.' })
  gradedBy?: string;
}
