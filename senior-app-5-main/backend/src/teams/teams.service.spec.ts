import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HttpException, HttpStatus } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { Team } from './schemas/team.schema';

describe('TeamsService', () => {
  let service: TeamsService;
  let mockTeamModel: any;

  beforeEach(async () => {
    mockTeamModel = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: getModelToken(Team.name),
          useValue: mockTeamModel,
        },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  describe('addMember', () => {
    it('should successfully add a member to a team and increment memberCount', async () => {
      const teamId = 'team123';
      const userId = 'user456';
      const leaderId = 'user001';

      const mockTeam = {
        _id: teamId,
        name: 'Test Team',
        leaderId,
        members: [leaderId],
        memberCount: 1,
      };

      const updatedTeam = {
        ...mockTeam,
        members: [leaderId, userId],
        memberCount: 2,
      };

      mockTeamModel.findById.mockResolvedValue(mockTeam);
      mockTeamModel.findByIdAndUpdate.mockResolvedValue(updatedTeam);

      const result = await service.addMember(teamId, userId);

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      const team = result.data;
      expect(team?.memberCount).toBe(2);
      expect(team?.members).toContain(userId);
      expect(mockTeamModel.findByIdAndUpdate).toHaveBeenCalledWith(
        teamId,
        {
          $push: { members: userId },
          $inc: { memberCount: 1 },
        },
        { new: true },
      );
    });

    it('should return 404 if team does not exist', async () => {
      mockTeamModel.findById.mockResolvedValue(null);

      await expect(service.addMember('nonexistent', 'user123')).rejects.toThrow(
        new HttpException('Team not found', HttpStatus.NOT_FOUND),
      );
    });

    it('should return 422 if user is already a member', async () => {
      const teamId = 'team123';
      const userId = 'user456';
      const leaderId = 'user001';

      const mockTeam = {
        _id: teamId,
        name: 'Test Team',
        leaderId,
        members: [leaderId, userId],
        memberCount: 2,
      };

      mockTeamModel.findById.mockResolvedValue(mockTeam);

      await expect(service.addMember(teamId, userId)).rejects.toThrow(
        new HttpException(
          'User is already a member of this team',
          HttpStatus.UNPROCESSABLE_ENTITY,
        ),
      );
    });
  });

  describe('findById', () => {
    it('should return a team by id', async () => {
      const teamId = 'team123';
      const mockTeam = {
        _id: teamId,
        name: 'Test Team',
        leaderId: 'user001',
        members: ['user001'],
        memberCount: 1,
      };

      mockTeamModel.findById.mockResolvedValue(mockTeam);

      const result = await service.findById(teamId);

      expect(result).toEqual(mockTeam);
    });

    it('should return null if team does not exist', async () => {
      mockTeamModel.findById.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createTeam', () => {
    it('should create a new team with leader as first member', async () => {
      const name = 'New Team';
      const leaderId = 'user001';

      const mockTeam = {
        _id: 'team123',
        name,
        leaderId,
        members: [leaderId],
        memberCount: 1,
      };

      mockTeamModel.create.mockResolvedValue(mockTeam);

      const result = await service.createTeam(name, leaderId);

      expect(result).toEqual(mockTeam);
      expect(mockTeamModel.create).toHaveBeenCalledWith({
        name,
        leaderId,
        members: [leaderId],
        memberCount: 1,
      });
    });
  });
});
