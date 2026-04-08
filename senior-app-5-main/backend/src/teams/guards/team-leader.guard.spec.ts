import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  ForbiddenException,
  NotFoundException,
  ExecutionContext,
} from '@nestjs/common';
import { TeamLeaderGuard } from './team-leader.guard';
import { Team } from '../schemas/team.schema';

describe('TeamLeaderGuard', () => {
  let guard: TeamLeaderGuard;
  let mockTeamModel: any;

  beforeEach(async () => {
    mockTeamModel = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamLeaderGuard,
        {
          provide: getModelToken(Team.name),
          useValue: mockTeamModel,
        },
      ],
    }).compile();

    guard = module.get<TeamLeaderGuard>(TeamLeaderGuard);
  });

  it('should allow access if user is team leader', async () => {
    const teamId = 'team123';
    const userId = 'user001';

    const mockTeam = {
      _id: teamId,
      name: 'Test Team',
      leaderId: userId,
      members: [userId],
      memberCount: 1,
    };

    mockTeamModel.findById.mockResolvedValue(mockTeam);

    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { userId, email: 'leader@test.com' },
          params: { teamId },
        }),
      }),
    } as any as ExecutionContext;

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if user is not logged in', async () => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: null,
          params: { teamId: 'team123' },
        }),
      }),
    } as any as ExecutionContext;

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw NotFoundException if team does not exist', async () => {
    const teamId = 'nonexistent';
    const userId = 'user001';

    mockTeamModel.findById.mockResolvedValue(null);

    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { userId, email: 'user@test.com' },
          params: { teamId },
        }),
      }),
    } as any as ExecutionContext;

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw ForbiddenException if user is not team leader', async () => {
    const teamId = 'team123';
    const userId = 'user456'; // Not the leader
    const leaderId = 'user001';

    const mockTeam = {
      _id: teamId,
      name: 'Test Team',
      leaderId,
      members: [leaderId, userId],
      memberCount: 2,
    };

    mockTeamModel.findById.mockResolvedValue(mockTeam);

    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { userId, email: 'user@test.com' },
          params: { teamId },
        }),
      }),
    } as any as ExecutionContext;

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
