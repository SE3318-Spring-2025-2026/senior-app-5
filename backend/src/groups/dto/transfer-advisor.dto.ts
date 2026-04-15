import { IsMongoId, IsNotEmpty } from 'class-validator';

export class TransferAdvisorRequest {
  @IsNotEmpty()
  @IsMongoId()
  currentAdvisorId!: string;

  @IsNotEmpty()
  @IsMongoId()
  newAdvisorId!: string;
}
