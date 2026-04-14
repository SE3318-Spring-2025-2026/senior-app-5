// backend/src/teams/teams.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HttpService } from '@nestjs/axios';
import { TeamsService } from './teams.service';
import { Team } from './schemas/team.schema';

const mockTeamModel = {
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

const mockHttpService = {
  get: jest.fn(),
};

describe('TeamsService', () => {
  let service: TeamsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<TeamsService>(TeamsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
