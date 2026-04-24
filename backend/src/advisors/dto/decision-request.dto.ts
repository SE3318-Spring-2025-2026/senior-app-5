import { IsEnum, IsNotEmpty } from 'class-validator';

export enum AdvisorDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class DecisionRequestDto {
  @IsNotEmpty()
  @IsEnum(AdvisorDecision)
  decision!: AdvisorDecision;
}
