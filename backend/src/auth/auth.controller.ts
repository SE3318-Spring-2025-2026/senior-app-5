import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  ForbiddenException,
} from '@nestjs/common';

import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from '../users/data/dto/register.dto';
import { LoginDto } from '../users/data/dto/login.dto';
import { CreateProfessorDto } from './dto/create-professor.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { LinkGithubDto } from '../users/dto/link-github.dto';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { Role } from './enums/role.enum';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiAcceptedResponse,
} from '@nestjs/swagger';

interface JwtUser {
  userId: string;
  email: string;
  role: string;
}

interface RequestWithUser extends Request {
  user: JwtUser;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({ description: 'User registered successfully' })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password);
  }

  @ApiOperation({ summary: 'Login and receive JWT access token' })
  @ApiOkResponse({
    type: LoginResponseDto,
    description: 'User logged in successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid login credentials' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto.email, dto.password);

    // Set refresh token as HttpOnly cookie
    if (result.refreshToken && result.userId) {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      };
      res.cookie('refreshToken', result.refreshToken, cookieOptions);
      res.cookie('refreshUserId', result.userId, cookieOptions);
    }

    return { accessToken: result.accessToken };
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = (req as any).cookies;
    const refreshToken = cookies?.refreshToken;
    const refreshUserId = cookies?.refreshUserId;
    if (!refreshToken || !refreshUserId) {
      throw new ForbiddenException('Refresh token not found');
    }

    const result = await this.authService.refreshAccessToken(refreshUserId, refreshToken);

    // Rotate refresh token cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    };
    res.cookie('refreshToken', result.refreshToken, cookieOptions);
    res.cookie('refreshUserId', result.userId, cookieOptions);

    return { accessToken: result.accessToken };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as JwtUser;
    await this.authService.logout(user.userId);

    // Clear cookies
    res.clearCookie('refreshToken', { path: '/' });
    res.clearCookie('refreshUserId', { path: '/' });

    return { message: 'Logged out' };
  }

  @ApiOperation({ summary: 'Request a password reset link' })
  @ApiAcceptedResponse({ description: 'Password reset request accepted' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Post('password-reset/request')
  requestPasswordReset(@Body() dto: PasswordResetRequestDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @ApiOperation({ summary: 'Confirm password reset using token' })
  @ApiOkResponse({ description: 'Password reset successfully completed' })
  @HttpCode(HttpStatus.OK)
  @Post('password-reset/confirm')
  confirmPasswordReset(@Body() dto: PasswordResetConfirmDto) {
    return this.authService.confirmPasswordReset(dto.token, dto.newPassword);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Register a new professor (coordinator only)' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized or invalid token' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Coordinator)
  @Post('admin/professors')
  async registerProfessor(@Body() body: CreateProfessorDto) {
    return this.authService.register(body.email, body.password, body.role);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Register a new coordinator (Admin only)' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized or invalid token' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Admin)
  @Post('admin/coordinators')
  async registerCoordinator(@Body() body: RegisterDto) {
    return this.authService.register(
      body.email,
      body.password,
      Role.Coordinator,
    );
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user details' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized or invalid token' })
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async me(@Req() req: RequestWithUser) {
    const user = await this.usersService.findById(req.user.userId);
    return {
      id: req.user.userId,
      email: req.user.email,
      role: req.user.role,
      isGithubConnected: !!user?.githubAccountId,
    };
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Link GitHub account using OAuth code' })
  @ApiOkResponse({ description: 'GitHub account linked successfully' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @UseGuards(AuthGuard('jwt'))
  @Post('users/:userId/integrations/github')
  async linkGithubIntegration(
    @Req() req: RequestWithUser,
    @Param('userId') userId: string,
    @Body() dto: LinkGithubDto,
  ) {
    if (req.user.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this account',
      );
    }

    return this.authService.linkGithubAccount(userId, dto.code);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get GitHub link status for the user' })
  @ApiOkResponse({
    description: 'Returns whether the user has linked a GitHub account',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @UseGuards(AuthGuard('jwt'))
  @Get('users/:userId/integrations/github')
  async getGithubIntegration(
    @Req() req: RequestWithUser,
    @Param('userId') userId: string,
  ) {
    if (req.user.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this account',
      );
    }
    return this.authService.getGithubStatus(userId);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Unlink the user’s GitHub account' })
  @ApiOkResponse({ description: 'GitHub account unlinked successfully' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @Delete('users/:userId/integrations/github')
  async unlinkGithubIntegration(
    @Req() req: RequestWithUser,
    @Param('userId') userId: string,
  ) {
    if (req.user.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this account',
      );
    }
    return this.authService.unlinkGithubAccount(userId);
  }
}
