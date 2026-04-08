import { Body, Controller, Get, Post, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express'; // 'type' kelimesini kaldırmak bazen tip tanımını netleştirir
import { AuthService } from './auth.service';
import { RegisterDto } from '../users/data/dto/register.dto';
import { LoginDto } from '../users/data/dto/login.dto';


interface JwtUser {
  userId: string;
  email: string;
  role: string;
}

interface RequestWithUser extends Request {
  user: JwtUser;
}

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

  
  @UseGuards(AuthGuard('jwt'))
  @Post('admin/professors')
  async registerProfessor(
    @Req() req: RequestWithUser, 
    @Body() body: { email: string; password: string; role: string }
  ) {
    
    if (req.user.role !== 'COORDINATOR') {
      throw new ForbiddenException('Only coordinators can register professors.');
    }

    
    return this.authService.register(body.email, body.password, body.role);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Req() req: RequestWithUser) {
    
    return { 
      id: req.user.userId, 
      email: req.user.email, 
      role: req.user.role 
    };
  }
}