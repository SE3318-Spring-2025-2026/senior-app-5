import { IsNotEmpty, IsString } from 'class-validator';

export class TransferAdvisorDto {
  @IsString()
  @IsNotEmpty()
  currentAdvisorId!: string;

  @IsString()
  @IsNotEmpty()
  newAdvisorId!: string;
}
