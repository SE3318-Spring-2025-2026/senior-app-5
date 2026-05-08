import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HttpService } from '@nestjs/axios';
import { TeamsSyncService } from './teams-sync.service';
import { Team } from './schemas/team.schema';
import { SprintStory } from './schemas/sprint-story.schema';
import { BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('TeamsSyncService', () => {
  let service: TeamsSyncService;
  let httpService: HttpService;

  const mockTeamModel = {
    findById: jest.fn(),
  };

  const mockSprintStoryModel = {
    findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn() }),
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsSyncService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: getModelToken(Team.name), useValue: mockTeamModel },
        { provide: getModelToken(SprintStory.name), useValue: mockSprintStoryModel },
      ],
    }).compile();

    service = module.get<TeamsSyncService>(TeamsSyncService);
    httpService = module.get<HttpService>(HttpService);
    jest.clearAllMocks();
  });

  it('should throw NotFoundException if team does not exist', async () => {
    mockTeamModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    await expect(service.syncStories('team-1')).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if team lacks JIRA credentials', async () => {
    mockTeamModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: 'team-1', jiraDomain: null }),
    });
    await expect(service.syncStories('team-1')).rejects.toThrow(BadRequestException);
  });

  it('should throw UnprocessableEntityException if JIRA API fails', async () => {
    mockTeamModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: 'team-1',
        jiraDomain: 'jira.com',
        jiraApiToken: 'token',
        jiraProjectKey: 'PROJ',
        jiraEmail: 'test@test.com'
      }),
    });

    jest.spyOn(httpService, 'get').mockImplementationOnce(() => throwError(() => new Error('Jira Down')));

    await expect(service.syncStories('team-1')).rejects.toThrow(UnprocessableEntityException);
  });

  it('should sync stories successfully when JIRA and GitHub respond properly', async () => {
    mockTeamModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: 'team-1',
        jiraDomain: 'jira.com',
        jiraApiToken: 'token',
        jiraProjectKey: 'PROJ',
        jiraEmail: 'test@test.com',
        githubRepositoryId: 'owner/repo',
      }),
    });

    // 1. Mock JIRA Search API Response
    jest.spyOn(httpService, 'get')
      .mockImplementationOnce(() => of({
        data: { issues: [{ key: 'PROJ-1', fields: { summary: 'Task 1', status: { name: 'Done' } } }] }
      } as any))
      // 2. Mock GitHub Branch API Response
      .mockImplementationOnce(() => of({ status: 200 } as any))
      // 3. Mock GitHub PR API Response
      .mockImplementationOnce(() => of({ data: [] } as any));

    const result = await service.syncStories('team-1');

    expect(result.totalIssues).toBe(1);
    expect(result.linkedCount).toBe(1);
    expect(result).toHaveProperty('syncRunId');
    expect(mockSprintStoryModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('should return latest sync results successfully', async () => {
    mockTeamModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: 'team-1' }) });
    const result = await service.getLatestSync('team-1');
    expect(Array.isArray(result)).toBe(true);
    expect(mockSprintStoryModel.find).toHaveBeenCalledWith({ teamId: 'team-1' });
  });
});