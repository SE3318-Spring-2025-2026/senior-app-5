// backend/src/admin/dto/move-student.dto.ts
import { IsString, IsMongoId } from 'class-validator';

export class MoveStudentDto {
  @IsString()
  @IsMongoId()
  groupId: string;
}
