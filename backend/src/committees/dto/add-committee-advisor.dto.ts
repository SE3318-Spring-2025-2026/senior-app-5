import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNotEmpty } from 'class-validator';

export enum AssignmentSource {
  PRIMARY_ADVISOR = 'PRIMARY_ADVISOR',
  JURY_MEMBER = 'JURY_MEMBER',
}

export class AddCommitteeAdvisorDto {
  @ApiProperty({ description: 'User ID of the advisor to assign' })
  @IsMongoId()
  @IsNotEmpty()
  advisorId!: string;

  @ApiProperty({
    enum: AssignmentSource,
    description: 'Whether the advisor is a primary advisor or additional jury member',
    example: AssignmentSource.JURY_MEMBER,
  })
  @IsEnum(AssignmentSource)
  assignmentSource!: AssignmentSource;
}
