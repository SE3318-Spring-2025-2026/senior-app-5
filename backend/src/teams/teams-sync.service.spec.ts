import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HttpService } from '@nestjs/axios';
import { TeamsSyncService } from './teams-sync.service';
import { Team } from './schemas/team.schema';
import { SprintStory, GithubStatus } from './schemas/sprint-story.schema';
import { User } from '../users/data/user.schema';
import { SprintConfig } from '../story-points/schemas/sprint-config.schema';
import { StoryPointRecord } from '../story-points/schemas/story-point-record.schema';
import { GeminiService } from '../ai/gemini.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { of } from 'rxjs';

// 1. Şifre çözücü (crypto) modülünü test için mock'luyoruz (Gerçek şifre çözme yapmasın diye)
jest.mock('../common/crypto/secret-cipher', () => ({
  decryptSecret: jest.fn((val) => val), // Token'ı olduğu gibi geri döndür
}));

// Mongoose zincirleme fonksiyonları (select.lean.exec vb.) için yardımcı mock fonksiyonu
const createMockQuery = (returnValue: any) => {
  const query: any = {};
  query.select = jest.fn().mockReturnValue(query);
  query.sort = jest.fn().mockReturnValue(query);
  query.lean = jest.fn().mockReturnValue(query);
  query.exec = jest.fn().mockResolvedValue(returnValue);
  return query;
};

describe('TeamsSyncService (Advanced)', () => {
  let service: TeamsSyncService;
  let httpService: HttpService;

  // 2. Yeni eklenen tüm veritabanı modellerini mock'luyoruz
  const mockTeamModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
  };

  const mockSprintStoryModel = {
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    find: jest.fn().mockReturnValue(createMockQuery([])),
    findOne: jest.fn().mockReturnValue(createMockQuery(null)),
  };

  const mockUserModel = {
    find: jest.fn().mockReturnValue(createMockQuery([])),
  };

  const mockSprintConfigModel = {
    findOne: jest.fn().mockReturnValue(createMockQuery(null)),
  };

  const mockStoryPointRecordModel = {
    findOneAndUpdate: jest.fn().mockReturnValue(createMockQuery({})),
  };

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  // 3. Gemini AI servisini test için mock'luyoruz
  const mockGeminiService = {
    isAvailable: jest.fn().mockReturnValue(false), // Testlerin hızlı çalışması için yapay zekayı kapalı varsayıyoruz
    evaluatePrReview: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsSyncService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: GeminiService, useValue: mockGeminiService },
        { provide: getModelToken(Team.name), useValue: mockTeamModel },
        { provide: getModelToken(SprintStory.name), useValue: mockSprintStoryModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(SprintConfig.name), useValue: mockSprintConfigModel },
        { provide: getModelToken(StoryPointRecord.name), useValue: mockStoryPointRecordModel },
      ],
    }).compile();

    service = module.get<TeamsSyncService>(TeamsSyncService);
    httpService = module.get<HttpService>(HttpService);
    jest.clearAllMocks();
  });

  // --- TEMEL TESTLER ---

  it('should throw NotFoundException if team does not exist', async () => {
    mockTeamModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    mockTeamModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    
    await expect(service.syncStories('507f1f77bcf86cd799439011')).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if team lacks JIRA credentials', async () => {
    mockTeamModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011', jiraDomain: null }),
    });
    
    await expect(service.syncStories('507f1f77bcf86cd799439011')).rejects.toThrow(BadRequestException);
  });

  // --- KAPSAMLI SENKRONİZASYON (HAPPY PATH) ---

  it('should sync stories successfully with mock users and AI bypassed', async () => {
    const mockTeamId = '507f1f77bcf86cd799439011';
    
    mockTeamModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: mockTeamId,
        groupId: 'group-1',
        jiraDomain: 'jira.com',
        jiraApiToken: 'token',
        jiraProjectKey: 'PROJ',
        jiraEmail: 'test@test.com',
        githubRepositoryId: 'owner/repo',
        githubToken: 'gh-token',
      }),
    });

    // Kullanıcı eşleştirme mock'u (JIRA ID'si olan 1 öğrenci var diyelim)
    mockUserModel.find.mockReturnValue(createMockQuery([
      { _id: 'student-1', jiraAccountId: 'jira-id-123', githubUsername: 'coder_student' }
    ]));

    // JIRA Sprint Search Mock'u (Board id yoksa JQL ile post atıyor)
    jest.spyOn(httpService, 'post').mockImplementationOnce(() => of({
      data: { 
        issues: [{ 
          key: 'PROJ-1', 
          fields: { 
            summary: 'Make AI work', 
            status: { name: 'Done' },
            resolution: { name: 'Done' },
            assignee: { accountId: 'jira-id-123' },
            customfield_10016: 5 // Story points
          } 
        }] 
      }
    } as any));

    // GitHub Branch ve PR Mock'ları (İkisi de bulundu)
    jest.spyOn(httpService, 'get')
      .mockImplementationOnce(() => of({ data: [{ name: 'feature/PROJ-1' }] } as any)) // Branch found
      .mockImplementationOnce(() => of({ data: [{ head: { ref: 'feature/PROJ-1' }, merged_at: '2026-05-08T00:00:00Z', user: { login: 'coder_student' } }] } as any)); // PR found & merged

    mockSprintStoryModel.findOneAndUpdate.mockReturnValue({ exec: jest.fn() });
    mockSprintStoryModel.find.mockReturnValue(createMockQuery([{ 
      githubStatus: GithubStatus.VERIFIED, 
      isComplete: true, 
      work: 5, 
      assigneeStudentId: 'student-1' 
    }]));

    const result = await service.syncStories(mockTeamId);

    expect(result.totalIssues).toBe(1);
    expect(result.linkedCount).toBe(1);
    expect(result).toHaveProperty('syncRunId');
    expect(mockSprintStoryModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

 

  it('should finalize sprint, lock stories, and calculate student records', async () => {
    const mockTeamId = '507f1f77bcf86cd799439011';
    
    mockTeamModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: mockTeamId }),
    });

    const mockSprintConfig = {
      targetStoryPoints: 20,
      isFinalized: false,
      save: jest.fn().mockResolvedValue(true),
    };
    mockSprintConfigModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockSprintConfig) });

    // Sync metodunu kısmen mockluyoruz (iç içe çağrıldığı için)
    jest.spyOn(service, 'syncStories').mockResolvedValue(null as any);
    
    mockSprintStoryModel.updateMany.mockReturnValue({ exec: jest.fn().mockResolvedValue({ modifiedCount: 3 }) });
    
    // Öğrenci puanları için db'de tamamlanmış görevler var gibi davranıyoruz
    mockSprintStoryModel.find.mockReturnValue(createMockQuery([
      { isComplete: true, assigneeStudentId: 'student-1', work: 8 },
      { isComplete: true, assigneeStudentId: 'student-1', work: 5 }
    ]));

    mockStoryPointRecordModel.findOneAndUpdate.mockReturnValue({ exec: jest.fn() });

    const result = await service.finalizeSprintSync(mockTeamId, 'sprint-1', 'group-1');

    expect(result.lockedCount).toBe(3);
    expect(result.studentRecords.length).toBe(1);
    expect(result.studentRecords[0].completedPoints).toBe(13); // 8 + 5
    expect(mockSprintConfig.save).toHaveBeenCalled();
  });
});