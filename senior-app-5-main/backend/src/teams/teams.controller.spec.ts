import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { AddMemberDto } from './dto/add-member.dto';
import { TeamLeaderGuard } from './guards/team-leader.guard';
import { Team } from './schemas/team.schema';

describe('TeamsController', () => {
  let controller: TeamsController;
  let service: TeamsService;

  beforeEach(async () => {
    const mockTeamsService = {
      addMember: jest.fn(),
      createTeam: jest.fn(),
      findById: jest.fn(),
    };

    const mockTeamModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [
        {
          provide: TeamsService,
          useValue: mockTeamsService,
        },
        {
          provide: getModelToken(Team.name),
          useValue: mockTeamModel,
        },
        TeamLeaderGuard,
      ],
    }).compile();

    controller = module.get<TeamsController>(TeamsController);
    service = module.get<TeamsService>(TeamsService);
  });

  describe('addMember', () => {
    it('should call teamsService.addMember with correct parameters', async () => {
      const teamId = 'team123';
      const userId = 'user456';
      const addMemberDto: AddMemberDto = { userId };
      const mockUser = { userId: 'leader123', email: 'leader@test.com' };
      const mockRequest = { user: mockUser } as any;

      const expectedResponse = {
        success: true,
        data: {
          _id: teamId,
          name: 'Test Team',
          leaderId: mockUser.userId,
          members: ['leader123', userId],
          memberCount: 2,
        },
      };

      jest
        .spyOn(service, 'addMember')
        .mockResolvedValue(expectedResponse as any);

      const result = await controller.addMember(
        teamId,
        addMemberDto,
        mockRequest,
      );

      expect(result).toEqual(expectedResponse);
      expect(service.addMember).toHaveBeenCalledWith(teamId, userId);
    });
  });
});
