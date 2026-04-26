import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  ForbiddenException
} from '@nestjs/common';

import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from '../users/data/dto/register.dto';
import { LoginDto } from '../users/data/dto/login.dto';
import { CreateProfessorDto } from './dto/create-professor.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
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
  constructor(private readonly authService: AuthService) {}

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
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
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
    return this.authService.register(body.email, body.password, Role.Coordinator);
  }
  
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user details' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized or invalid token' })
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Req() req: RequestWithUser) {
    return {
      id: req.user.userId,
      email: req.user.email,
      role: req.user.role,
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
    @Body('code') code: string,
  ) {
    // SECURITY: Prevent changing someone else's account from your own (403)
    if (req.user.userId !== userId) {
      throw new ForbiddenException('You do not have permission to modify this account');
    }

    return this.authService.linkGithubAccount(userId, code);
  }
}