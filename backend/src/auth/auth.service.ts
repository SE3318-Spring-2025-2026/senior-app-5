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

  async requestPasswordReset(email: string) {
    if (!email?.trim()) {
      throw new BadRequestException('Email is required');
    }

    const token = await this.usersService.createPasswordResetToken(email);
    if (token) {
      this.logger.log(`Password reset token generated for email: ${email}`);
      this.logger.debug(`Password reset token for ${email}: ${token}`);
    }

    return {
      message:
        'If an account exists for that email, a password reset link has been sent.',
    };
  }

  async confirmPasswordReset(token: string, newPassword: string) {
    if (!token?.trim() || !newPassword?.trim()) {
      throw new BadRequestException('Token and new password are required');
    }

    const user = await this.usersService.findByPasswordResetToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.usersService.updatePasswordHash(
      (user._id || user.id).toString(),
      passwordHash,
    );

    this.logger.log(`Password reset completed for email: ${user.email}`);
    return { message: 'Password has been reset successfully.' };
  }
}
