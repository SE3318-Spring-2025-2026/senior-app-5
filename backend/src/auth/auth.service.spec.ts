import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    createUser: jest.fn(),
    createPasswordResetToken: jest.fn(),
    findByPasswordResetToken: jest.fn(),
    updatePasswordHash: jest.fn(),
  } as any;

  const mockJwtService = {
    signAsync: jest.fn(),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should accept a password reset request and return a message', async () => {
    mockUsersService.createPasswordResetToken.mockResolvedValue('reset-token');

    const result = await service.requestPasswordReset('test@example.com');

    expect(mockUsersService.createPasswordResetToken).toHaveBeenCalledWith(
      'test@example.com',
    );
    expect(result).toEqual({
      message:
        'If an account exists for that email, a password reset link has been sent.',
    });
  });

  it('should confirm password reset when token is valid', async () => {
    const user = { _id: 'user-id', email: 'test@example.com' } as any;
    mockUsersService.findByPasswordResetToken.mockResolvedValue(user);
    mockUsersService.updatePasswordHash.mockResolvedValue(true);

    const result = await service.confirmPasswordReset(
      'valid-token',
      'newPassword123',
    );

    expect(mockUsersService.findByPasswordResetToken).toHaveBeenCalledWith(
      'valid-token',
    );
    expect(mockUsersService.updatePasswordHash).toHaveBeenCalledWith(
      'user-id',
      expect.any(String),
    );
    expect(result).toEqual({
      message: 'Password has been reset successfully.',
    });
  });
});
