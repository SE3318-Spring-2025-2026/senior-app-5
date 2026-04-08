import { IsString, IsUUID } from 'class-validator';

export class MoveStudentDto {
  @IsString()
  @IsUUID()
  groupId: string;
}