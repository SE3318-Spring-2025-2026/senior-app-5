import { ApiProperty } from '@nestjs/swagger';
import { JuryMemberResponseDto } from './jury-member-response.dto';

export class JuryMemberPageDto {
  @ApiProperty({ type: [JuryMemberResponseDto] })
  data!: JuryMemberResponseDto[];

  @ApiProperty({ description: 'Total jury assignments for this committee' })
  total!: number;

  @ApiProperty({ description: 'Current page index (1-based)' })
  page!: number;

  @ApiProperty({ description: 'Page size' })
  limit!: number;
}
