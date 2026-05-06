import { ApiProperty } from '@nestjs/swagger';

export enum CommitteeGradeStatus {
  PENDING = 'PENDING',
  GRADED = 'GRADED',
}

export class CommitteeMemberGradeDto {
  @ApiProperty({ description: 'UUID of the committee member' })
  memberId!: string;

  @ApiProperty({ enum: ['A', 'B', 'C', 'D', 'F'] })
  grade!: string;
}

export class CommitteeGradeResultDto {
  @ApiProperty()
  groupId!: string;

  @ApiProperty()
  deliverableId!: string;

  @ApiProperty()
  submissionId!: string;

  @ApiProperty({ type: [CommitteeMemberGradeDto] })
  committeeGradeList!: CommitteeMemberGradeDto[];

  @ApiProperty({ description: 'Numeric average across all member grades (A=4, B=3, C=2, D=1, F=0)' })
  averageGrade!: number;

  @ApiProperty({ enum: CommitteeGradeStatus })
  status!: CommitteeGradeStatus;
}
