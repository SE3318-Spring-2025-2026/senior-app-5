import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    requestPasswordReset: jest.fn(),
    confirmPasswordReset: jest.fn(),
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
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
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
