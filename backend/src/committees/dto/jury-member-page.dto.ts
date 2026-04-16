import { ApiProperty } from '@nestjs/swagger';
import { JuryMemberResponseDto } from './jury-member-response.dto';

export class JuryMemberPageDto {
  @ApiProperty({ type: [JuryMemberResponseDto] })
  data: JuryMemberResponseDto[];

  @ApiProperty({ example: 2 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}