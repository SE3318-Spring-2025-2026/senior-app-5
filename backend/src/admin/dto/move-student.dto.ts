// backend/src/admin/dto/move-student.dto.ts
import { IsString, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MoveStudentDto {
  @ApiProperty({
    example: '6506c30f8e8c2d1b3e8a6def',
    description: 'MongoDB ObjectId of the target group',
  })
  @IsString()
  @IsMongoId()
  groupId: string;
}
