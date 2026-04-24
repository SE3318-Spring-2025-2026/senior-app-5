import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { Role } from './enums/role.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(email: string, password: string, role: Role = Role.Student) {
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      this.logger.warn(`Registration attempt with existing email: ${email}`);
      throw new ConflictException('Email already in use');
    }

    try {
      const passwordHash = await bcrypt.hash(password, 12);

      this.logger.debug(`Creating user with email: ${email} and role: ${role}`);

      const user = await this.usersService.createUser({
        email,
        passwordHash,
          role,
      });

      this.logger.log(`User registered successfully: ${email} as ${role}`);

      return {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      };
    } catch (error) {
      this.logger.error(`Registration failed for email: ${email}`);
      throw error;
    }
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      this.logger.warn(`Failed login attempt for email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwt.signAsync({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    this.logger.log(`User logged in successfully: ${email}`);
    return { accessToken };
  }
}
