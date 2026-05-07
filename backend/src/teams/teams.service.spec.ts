import { Test, TestingModule } from '@nestjs/testing';
import { TeamsService } from './teams.service';
import { HttpService } from '@nestjs/axios';
import { getModelToken } from '@nestjs/mongoose';
import { Team } from './schemas/team.schema';
import { of, throwError } from 'rxjs';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('TeamsService - updateIntegrations', () => {
  let service: TeamsService;
  let httpService: HttpService;

  const mockTeamId = 'team123';
  const mockDto = {
    jiraProjectKey: 'JIRA-1',
    jiraDomain: 'test.atlassian.net',
    jiraEmail: 'test@test.com',
    jiraApiToken: 'token123',
    githubRepositoryId: 'repo123',
  };

  const mockUpdatedTeam = {
    _id: mockTeamId,
    ...mockDto,
    toObject: jest.fn().mockReturnValue({
      _id: mockTeamId,
      ...mockDto,
    }),
  };

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
    };

    const mockTeamModel = {
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUpdatedTeam),
      }),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: getModelToken(Team.name), useValue: mockTeamModel },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should update integrations successfully and strip jiraApiToken from response', async () => {
    jest.spyOn(httpService, 'get').mockImplementation(() => of({ data: {} } as any));

    const result = await service.updateIntegrations(mockTeamId, mockDto);

    expect(result.success).toBe(true);
    
    expect(result.data.jiraApiToken).toBeUndefined();
    expect(result.data.jiraDomain).toBe(mockDto.jiraDomain);
  });

  it('should throw 422 if GitHub repository is invalid', async () => {
    jest.spyOn(httpService, 'get').mockImplementationOnce(() => throwError(() => new Error('GitHub Error')));

    await expect(service.updateIntegrations(mockTeamId, mockDto)).rejects.toThrow(
      new HttpException('Invalid or not found GitHub Repository ID.', HttpStatus.UNPROCESSABLE_ENTITY),
    );
  });

  it('should throw 422 with Auth message if Jira returns 401 Unauthorized', async () => {
    jest.spyOn(httpService, 'get').mockImplementationOnce(() => of({ data: {} } as any));
    jest.spyOn(httpService, 'get').mockImplementationOnce(() => throwError(() => ({ response: { status: 401 } })));

    await expect(service.updateIntegrations(mockTeamId, mockDto)).rejects.toThrow(
      new HttpException('Jira Authentication failed. Please check your Email and API Token.', HttpStatus.UNPROCESSABLE_ENTITY),
    );
  });

  it('should throw 422 with generic message if Jira returns 404 Not Found', async () => {
    jest.spyOn(httpService, 'get').mockImplementationOnce(() => of({ data: {} } as any));
    jest.spyOn(httpService, 'get').mockImplementationOnce(() => throwError(() => ({ response: { status: 404 } })));

    await expect(service.updateIntegrations(mockTeamId, mockDto)).rejects.toThrow(
      new HttpException('Invalid Jira Project Key or Domain.', HttpStatus.UNPROCESSABLE_ENTITY),
    );
  });
});