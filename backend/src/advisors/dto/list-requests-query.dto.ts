import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AdvisorRequestStatus } from '../schemas/advisor-request.schema';

export class ListRequestsQueryDto {
  @IsOptional()
  @IsString()
  requestedAdvisorId?: string;

  @IsOptional()
  @IsEnum(AdvisorRequestStatus)
  status?: AdvisorRequestStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
