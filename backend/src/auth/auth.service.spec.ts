import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    createUser: jest.fn(),
    createPasswordResetToken: jest.fn(),
    findByPasswordResetToken: jest.fn(),
    updatePasswordHash: jest.fn(),
    linkGithubAccount: jest.fn(),
    unlinkGithubAccount: jest.fn(),
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

  describe('linkGithubAccount (Issue #175 QA)', () => {
    const mockUserId = '111111111111111111111111';

    beforeEach(() => {
      global.fetch = jest.fn() as any;
    });

    it('should throw BadRequestException if code is empty', async () => {
      await expect(service.linkGithubAccount(mockUserId, '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if GitHub returns an error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({ error: 'bad_verification_code' }),
      });

      await expect(
        service.linkGithubAccount(mockUserId, 'invalid_code'),
      ).rejects.toThrow(BadRequestException);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should successfully link account when valid code is provided', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          access_token: 'valid_mock_token',
          scope: 'read:user,read:project,repo',
        }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({ id: 12345678, login: 'testuser' }),
      });

      mockUsersService.linkGithubAccount.mockResolvedValue(true);

      const result = await service.linkGithubAccount(mockUserId, 'valid_code');

      expect(result.isGithubConnected).toBe(true);
      expect(result.scopes).toBe('read:user,read:project,repo');
      expect(mockUsersService.linkGithubAccount).toHaveBeenCalledWith(
        mockUserId,
        '12345678',
        'testuser',
        'valid_mock_token',
        'read:user,read:project,repo',
      );
    });
  });

  describe('unlinkGithubAccount', () => {
    const mockUserId = '111111111111111111111111';

    it('should throw NotFoundException when the user does not exist', async () => {
      mockUsersService.findById.mockResolvedValue(null);
      await expect(service.unlinkGithubAccount(mockUserId)).rejects.toThrow(
        'User not found',
      );
    });

    it('should unlink the account when the user exists', async () => {
      mockUsersService.findById.mockResolvedValue({ _id: mockUserId } as any);
      mockUsersService.unlinkGithubAccount.mockResolvedValue(true);

      const result = await service.unlinkGithubAccount(mockUserId);

      expect(mockUsersService.unlinkGithubAccount).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(result.isGithubConnected).toBe(false);
    });
  });

  describe('getGithubStatus', () => {
    const mockUserId = '111111111111111111111111';

    it('should return connected=true when user has githubAccountId', async () => {
      const linkedAt = new Date('2026-05-06T10:00:00Z');
      mockUsersService.findById.mockResolvedValue({
        _id: mockUserId,
        githubAccountId: '99',
        githubScopes: 'read:user,read:project,repo',
        githubLinkedAt: linkedAt,
      } as any);

      const result = await service.getGithubStatus(mockUserId);
      expect(result).toEqual({
        isGithubConnected: true,
        githubAccountId: '99',
        scopes: 'read:user,read:project,repo',
        linkedAt,
      });
    });

    it('should return connected=false when user has no githubAccountId', async () => {
      mockUsersService.findById.mockResolvedValue({ _id: mockUserId } as any);

      const result = await service.getGithubStatus(mockUserId);
      expect(result).toEqual({
        isGithubConnected: false,
        githubAccountId: null,
        scopes: null,
        linkedAt: null,
      });
    });
  });
});
