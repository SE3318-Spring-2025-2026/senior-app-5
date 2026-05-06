import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LinkGithubDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f6',
    description:
      'OAuth authorization code returned by GitHub after user consent',
  })
  @IsNotEmpty()
  @IsString()
  code!: string;
}
