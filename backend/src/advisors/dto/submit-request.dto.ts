import { IsNotEmpty, IsUUID } from 'class-validator';

export class SubmitRequestDto {
  @IsNotEmpty()
  @IsUUID()
  requestedAdvisorId!: string;
}
