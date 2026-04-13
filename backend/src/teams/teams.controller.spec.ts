// backend/src/teams/teams.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HttpService } from '@nestjs/axios';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { Team } from './schemas/team.schema';

const mockTeamModel = {
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

const mockHttpService = {
  get: jest.fn(),
};

describe('TeamsController', () => {
  let controller: TeamsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [
        TeamsService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: getModelToken(Team.name),
          useValue: mockTeamModel,
        },
      ],
    }).compile();

    controller = module.get<TeamsController>(TeamsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
