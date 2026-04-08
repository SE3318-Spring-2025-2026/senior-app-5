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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(email: string, password: string) {
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
      // Note: Do NOT log password or passwordHash
      this.logger.debug(`Creating user with email: ${email}`);
      
      const user = await this.usersService.createUser({ email, passwordHash });
      this.logger.log(`User registered successfully: ${email}`);

      return { id: user.id, email: user.email };
    } catch (error) {
      this.logger.error(`Registration failed for email: ${email}`);
      throw error;
    }
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Do NOT reveal whether email exists
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      this.logger.warn(`Failed login attempt for email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });

    this.logger.log(`User logged in successfully: ${email}`);
    return { accessToken };
  }
}
