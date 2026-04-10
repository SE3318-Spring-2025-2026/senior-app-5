import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListAdvisorsQueryDto {
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

  // TODO - Standardize role values to uppercase in the database and remove the lowercase check
  @IsOptional()
  @IsIn(['PROFESSOR'])
  role = 'PROFESSOR';
}
