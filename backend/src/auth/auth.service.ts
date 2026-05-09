import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { Role } from './enums/role.enum';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
    private readonly mailService: MailService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  private async recordActivity(
    eventType: string,
    summary: string,
    options?: {
      actorUserId?: string;
      actorRole?: string;
      targetType?: string;
      targetId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    try {
      await this.activityLogsService.create({
        eventType,
        summary,
        actorUserId: options?.actorUserId,
        actorRole: options?.actorRole,
        targetType: options?.targetType,
        targetId: options?.targetId,
        metadata: options?.metadata,
      });
    } catch (error) {
      this.logger.warn(
        `Activity log skipped for ${eventType}: ${(error as Error).message}`,
      );
    }
  }

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
      await this.recordActivity(
        'AUTH_USER_REGISTERED',
        'User account created',
        {
          actorUserId: user._id.toString(),
          actorRole: user.role,
          targetType: 'user',
          targetId: user._id.toString(),
          metadata: {
            email: user.email,
            role: user.role,
          },
        },
      );

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

    // Generate refresh token and persist its hash
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const refreshHash = await bcrypt.hash(refreshToken, 12);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

    await this.usersService.setRefreshToken(
      user._id.toString(),
      refreshHash,
      expiresAt,
    );

    this.logger.log(`User logged in successfully: ${email}`);
    await this.recordActivity('AUTH_LOGIN', 'User logged in', {
      actorUserId: user._id.toString(),
      actorRole: user.role,
      targetType: 'user',
      targetId: user._id.toString(),
      metadata: {
        email: user.email,
      },
    });
    return {
      accessToken,
      refreshToken,
      refreshExpiresAt: expiresAt.toISOString(),
      userId: user._id.toString(),
    };
  }

  async refreshAccessToken(refreshUserId: string, refreshToken: string) {
    const user = await this.usersService.findById(refreshUserId);
    if (!user || !user.refreshTokenHash || !user.refreshTokenExpiresAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (user.refreshTokenExpiresAt.getTime() < Date.now()) {
      await this.usersService.clearRefreshToken(refreshUserId);
      throw new UnauthorizedException('Refresh token expired');
    }

    const ok = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Issue new access token and rotate refresh token
    const accessToken = await this.jwt.signAsync({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const newRefreshToken = crypto.randomBytes(48).toString('hex');
    const newRefreshHash = await bcrypt.hash(newRefreshToken, 12);
    const newExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

    await this.usersService.setRefreshToken(
      user._id.toString(),
      newRefreshHash,
      newExpiresAt,
    );
    await this.recordActivity('AUTH_TOKEN_REFRESH', 'Access token refreshed', {
      actorUserId: user._id.toString(),
      actorRole: user.role,
      targetType: 'user',
      targetId: user._id.toString(),
      metadata: {
        email: user.email,
      },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      refreshExpiresAt: newExpiresAt.toISOString(),
      userId: user._id.toString(),
    };
  }

  async logout(userId: string) {
    const user = await this.usersService.findById(userId);
    await this.usersService.clearRefreshToken(userId);
    await this.recordActivity('AUTH_LOGOUT', 'User logged out', {
      actorUserId: userId,
      actorRole: user?.role,
      targetType: 'user',
      targetId: userId,
      metadata: {
        email: user?.email ?? null,
      },
    });
    return { success: true };
  }

  async requestPasswordReset(email: string) {
    if (!email?.trim()) {
      throw new BadRequestException('Email is required');
    }

    const user = await this.usersService.findByEmail(email);
    const token = await this.usersService.createPasswordResetToken(email);
    if (token) {
      this.logger.log(`Password reset token generated for email: ${email}`);
      if (user) {
        await this.recordActivity(
          'AUTH_PASSWORD_RESET_REQUESTED',
          'Password reset requested',
          {
            actorUserId: user._id.toString(),
            actorRole: user.role,
            targetType: 'user',
            targetId: user._id.toString(),
            metadata: {
              email: user.email,
            },
          },
        );
      }
      try {
        await this.mailService.sendPasswordReset(email, token);
        this.logger.log(`Password reset email successfully sent to ${email}`);
      } catch (err) {
        this.logger.error(
          `Failed to send password reset email to ${email}: ${(err as Error).message}`,
        );
      }
    } else {
      this.logger.warn(`Password reset requested for unknown email: ${email}`);
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
    await this.recordActivity(
      'AUTH_PASSWORD_RESET_CONFIRMED',
      'Password reset completed',
      {
        actorUserId: (user._id || user.id).toString(),
        actorRole: user.role,
        targetType: 'user',
        targetId: (user._id || user.id).toString(),
        metadata: {
          email: user.email,
        },
      },
    );
    return { message: 'Password has been reset successfully.' };
  }

  async linkGithubAccount(userId: string, code: string) {
    if (!code?.trim()) {
      throw new BadRequestException('GitHub authorization code is required');
    }

    try {
      this.logger.debug(`Exchanging GitHub code for user: ${userId}`);

      // STEP 1: Swap with GitHub
      const tokenResponse = await fetch(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code: code,
          }),
        },
      );

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        this.logger.error(`GitHub Token Error: ${tokenData.error_description}`);
        throw new BadRequestException(
          'Invalid or expired GitHub authorization code',
        );
      }

      // STEP 2: Retrieve GitHub ID using the token
      const userResponse = await fetch('https://api.github.com/user', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      const githubUser = await userResponse.json();

      if (!githubUser || !githubUser.id) {
        throw new BadRequestException('Failed to retrieve GitHub user data');
      }

      // STEP 3: Persist the GitHub identity AND the access token + granted
      // scopes so the backend can later read project / issue data on behalf
      // of the user (e.g. story points, issue completion).
      await this.usersService.linkGithubAccount(
        userId,
        githubUser.id.toString(),
        githubUser.login,
        tokenData.access_token,
        tokenData.scope,
      );
      this.logger.log(`Successfully linked GitHub account for user: ${userId}`);
      const user = await this.usersService.findById(userId);
      await this.recordActivity('AUTH_GITHUB_LINKED', 'GitHub account linked', {
        actorUserId: userId,
        actorRole: user?.role,
        targetType: 'user',
        targetId: userId,
        metadata: {
          githubLogin: githubUser.login,
          githubAccountId: githubUser.id?.toString?.() ?? null,
          scopes: tokenData.scope ?? '',
        },
      });

      return {
        message: 'GitHub account linked successfully',
        isGithubConnected: true,
        scopes: tokenData.scope ?? '',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to link GitHub account: ${errorMessage}`);

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new BadRequestException(
        'An error occurred while linking GitHub account',
      );
    }
  }

  async unlinkGithubAccount(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersService.unlinkGithubAccount(userId);
    this.logger.log(`Unlinked GitHub account for user: ${userId}`);
    await this.recordActivity(
      'AUTH_GITHUB_UNLINKED',
      'GitHub account unlinked',
      {
        actorUserId: userId,
        actorRole: user.role,
        targetType: 'user',
        targetId: userId,
        metadata: {
          email: user.email,
        },
      },
    );
    return {
      message: 'GitHub account unlinked successfully',
      isGithubConnected: false,
    };
  }

  async getGithubStatus(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      isGithubConnected: !!user.githubAccountId,
      githubAccountId: user.githubAccountId ?? null,
      scopes: user.githubScopes ?? null,
      linkedAt: user.githubLinkedAt ?? null,
    };
  }
}
