import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { Role } from '../enums/role.enum';

export class CreateProfessorDto {
  @ApiProperty({
    example: 'prof@example.com',
    description: 'Professor email address',
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email!: string;

  @ApiProperty({ example: 'ProfSecure1', description: 'Professor password' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/[a-z]/, {
    message: 'Password must contain at least one lowercase letter',
  })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  password!: string;

  @ApiProperty({
    example: Role.Professor,
    enum: Role,
    description: 'User role to assign',
  })
  @IsEnum(Role, { message: 'Role must be one of the supported role values' })
  role!: Role;
}
