import { ApiProperty } from '@nestjs/swagger';
import { StoryPointSource } from '../schemas/story-point-record.schema';

export class StudentStoryPointRecordDto {
  @ApiProperty() studentId!: string;
  @ApiProperty() completedPoints!: number;
  @ApiProperty() targetPoints!: number;
  @ApiProperty({ enum: StoryPointSource }) source!: StoryPointSource;
  @ApiProperty() updatedAt!: Date;
}

export class StoryPointSummaryDto {
  @ApiProperty() groupId!: string;
  @ApiProperty() sprintId!: string;
  @ApiProperty({ type: [StudentStoryPointRecordDto] })
  records!: StudentStoryPointRecordDto[];
}
