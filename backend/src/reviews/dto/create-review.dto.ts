import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsString, IsUUID } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({
    description: 'MongoDB ObjectId of the submission to review',
    example: '665f2b8a5f2d8f2e2c123456',
  })
  @IsMongoId()
  submissionId!: string;

  @ApiProperty({
    description: 'UUID of the committee assigned to the submission group',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    format: 'uuid',
  })
  @IsString()
  @IsUUID()
  committeeId!: string;
}
