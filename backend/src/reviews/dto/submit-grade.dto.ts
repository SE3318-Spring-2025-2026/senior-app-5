import { IsNumber, Max, Min } from 'class-validator';

export class SubmitGradeDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  grade!: number;
}
