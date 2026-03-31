import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from '../users/data/dto/register.dto';
import { LoginDto } from '../users/data/dto/login.dto';

type JwtUser = { userId: string; email: string };
type RequestWithUser = Request & { user: JwtUser };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Req() req: RequestWithUser) {
    return { id: req.user.userId, email: req.user.email };
  }
}
