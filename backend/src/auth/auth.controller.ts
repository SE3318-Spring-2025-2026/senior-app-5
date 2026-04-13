import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express'; // 'type' kelimesini kaldırmak bazen tip tanımını netleştirir
import { AuthService } from './auth.service';
import { RegisterDto } from '../users/data/dto/register.dto';
import { LoginDto } from '../users/data/dto/login.dto';
import { CreateProfessorDto } from './dto/create-professor.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
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
  @ApiOkResponse({ type: LoginResponseDto, description: 'User logged in successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid login credentials' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Register a new professor (coordinator only)' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized or invalid token' })
  @UseGuards(AuthGuard('jwt'))
  @Post('admin/professors')
  async registerProfessor(
    @Req() req: RequestWithUser,
    @Body() body: CreateProfessorDto,
  ) {
    if (req.user.role !== 'COORDINATOR') {
      throw new ForbiddenException(
        'Only coordinators can register professors.',
      );
    }

    return this.authService.register(body.email, body.password, body.role);
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
}
