import { IsMongoId, IsNotEmpty } from 'class-validator';

export class SubmitRequestDto {
  @IsNotEmpty()
  @IsMongoId()
  requestedAdvisorId!: string;
}
