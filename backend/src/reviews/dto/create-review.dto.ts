import { IsString } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  submissionId!: string;

  @IsString()
  committeeId!: string;
}
