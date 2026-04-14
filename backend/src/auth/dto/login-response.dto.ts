import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NWE2YzM4MDQ4YTRlYThmOWU3MzAyZiIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJTdHVkZW50IiwiaWF0IjoxNjg5NjY3MzM4LCJleHAiOjE2ODk2NjgzMzh9.KXk1EJvGpOdS5BbYHy7Dk5lnAJpttU8O3XQF9V1O3mc',
    description: 'JWT access token returned after successful login',
  })
  accessToken!: string;
}
