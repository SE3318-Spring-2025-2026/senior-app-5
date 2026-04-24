import { IsEnum, IsNotEmpty } from 'class-validator';
import { AdvisorRequestStatus } from '../schemas/advisor-request.schema';

export enum WithdrawRequestStatus {
  WITHDRAWN = AdvisorRequestStatus.WITHDRAWN,
}

export class UpdateRequestStatusDto {
  @IsNotEmpty()
  @IsEnum(WithdrawRequestStatus)
  status!: WithdrawRequestStatus;
}
