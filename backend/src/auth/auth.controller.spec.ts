import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    requestPasswordReset: jest.fn(),
    confirmPasswordReset: jest.fn(),
  } as any;

  const mockUsersService = {
    findById: jest.fn(),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });
  
  it('me returns id, email, role, groupId, and teamId from request user', async () => {
    mockUsersService.findById.mockResolvedValue({ githubAccountId: null });
    const req = {
      user: {
        userId: 'user-1',
        email: 'a@b.com',
        role: 'Student',
        groupId: 'group-uuid',
      },
    } as any;
  
    const result = await controller.me(req);
  
    expect(result).toEqual({
      id: 'user-1',
      email: 'a@b.com',
      role: 'Student',
      groupId: 'group-uuid',
      teamId: 'group-uuid',
      isGithubConnected: false,
    });
  });
  
  it('me returns null groupId and teamId when user has no group', async () => {
    mockUsersService.findById.mockResolvedValue(null);
    const req = {
      user: {
        userId: 'user-1',
        email: 'a@b.com',
        role: 'Student',
        groupId: null,
      },
    } as any;
  
    const result = await controller.me(req);
  
    expect(result.groupId).toBeNull();
    expect(result.teamId).toBeNull();
  });


  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call requestPasswordReset with the provided email', async () => {
    mockAuthService.requestPasswordReset.mockResolvedValue({ message: 'ok' });

    await controller.requestPasswordReset({ email: 'test@example.com' });

    expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith(
      'test@example.com',
    );
  });

  it('should call confirmPasswordReset with provided token and password', async () => {
    mockAuthService.confirmPasswordReset.mockResolvedValue({ message: 'ok' });

    await controller.confirmPasswordReset({
      token: 'token',
      newPassword: 'newPassword123',
    });

    expect(mockAuthService.confirmPasswordReset).toHaveBeenCalledWith(
      'token',
      'newPassword123',
    );
  });
});
