import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LinkGithubDto {
  @ApiProperty({
    example: 'gho_1234567890abcdef',
    description: 'GitHub OAuth access token',
  })
  @IsNotEmpty()
  @IsString()
  oauthAccessToken!: string;
}
