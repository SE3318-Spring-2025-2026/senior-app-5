import {
  BadGatewayException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { SprintConfig } from './schemas/sprint-config.schema';
import {
  StoryPointRecord,
  StoryPointSource,
} from './schemas/story-point-record.schema';
import { StoryPointsService } from './story-points.service';
import { JiraGithubService } from './jira-github.service';
import { User } from '../users/data/user.schema';

const NOW = new Date('2026-04-30T12:00:00Z');
const SPRINT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const GROUP_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const STUDENT_A = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const STUDENT_B = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const activeSprintConfig = {
  sprintId: SPRINT_ID,
  groupId: GROUP_ID,
  targetStoryPoints: 10,
  startDate: new Date('2026-04-01'),
  endDate: new Date('2026-05-31'),
  phase: 'SCRUM',
};

function makeRecordModel() {
  const model: any = {
    findOne: jest.fn(),
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };
  model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
  model.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
  model.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
  return model;
}

function makeSprintModel(config = activeSprintConfig) {
  return { findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(config) }) };
}

function makeUserModel(ids: string[] = [STUDENT_A, STUDENT_B]) {
  const docs = ids.map((id) => ({ _id: { toString: () => id } }));
  return { find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(docs) }) };
}

describe('StoryPointsService', () => {
  let service: StoryPointsService;
  let recordModel: ReturnType<typeof makeRecordModel>;
  let sprintModel: ReturnType<typeof makeSprintModel>;
  let userModel: ReturnType<typeof makeUserModel>;
  let jiraService: { fetchStoryPoints: jest.Mock };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOW);

    recordModel = makeRecordModel();
    sprintModel = makeSprintModel();
    userModel = makeUserModel();
    jiraService = { fetchStoryPoints: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoryPointsService,
        { provide: getModelToken(StoryPointRecord.name), useValue: recordModel },
        { provide: getModelToken(SprintConfig.name), useValue: sprintModel },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: JiraGithubService, useValue: jiraService },
      ],
    }).compile();

    service = module.get<StoryPointsService>(StoryPointsService);
  });

  afterEach(() => jest.useRealTimers());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // fetchAndVerify
  // ──────────────────────────────────────────────
  describe('fetchAndVerify', () => {
    it('happy path: fetches JIRA_GITHUB records for all group members', async () => {
      jiraService.fetchStoryPoints.mockResolvedValue([
        { studentId: STUDENT_A, completedPoints: 5 },
        { studentId: STUDENT_B, completedPoints: 8 },
      ]);

      const updatedA = { studentId: STUDENT_A, completedPoints: 5, targetPoints: 10, source: StoryPointSource.JIRA_GITHUB, updatedAt: NOW };
      const updatedB = { studentId: STUDENT_B, completedPoints: 8, targetPoints: 10, source: StoryPointSource.JIRA_GITHUB, updatedAt: NOW };

      recordModel.findOneAndUpdate
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(updatedA) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(updatedB) });

      recordModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([updatedA, updatedB]),
      });

      const result = await service.fetchAndVerify(GROUP_ID, SPRINT_ID, {}, 'coord-1');

      expect(jiraService.fetchStoryPoints).toHaveBeenCalledWith(GROUP_ID, SPRINT_ID, [STUDENT_A, STUDENT_B]);
      expect(result.groupId).toBe(GROUP_ID);
      expect(result.sprintId).toBe(SPRINT_ID);
      expect(result.records).toHaveLength(2);
    });

    it('COORDINATOR_OVERRIDE is NOT overwritten by a subsequent JIRA_GITHUB fetch', async () => {
      jiraService.fetchStoryPoints.mockResolvedValue([
        { studentId: STUDENT_A, completedPoints: 3 },
      ]);

      const overrideRecord = {
        studentId: STUDENT_A,
        completedPoints: 99,
        source: StoryPointSource.COORDINATOR_OVERRIDE,
      };

      recordModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(overrideRecord),
      });

      recordModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([overrideRecord]),
      });

      userModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ _id: { toString: () => STUDENT_A } }]),
      });

      await service.fetchAndVerify(GROUP_ID, SPRINT_ID, { studentIds: [STUDENT_A] }, 'coord-1');

      expect(recordModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('throws 502 BadGatewayException when JIRA/GitHub API is unreachable', async () => {
      jiraService.fetchStoryPoints.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(
        service.fetchAndVerify(GROUP_ID, SPRINT_ID, {}, 'coord-1'),
      ).rejects.toThrow(BadGatewayException);
    });

    it('throws 422 UnprocessableEntityException when sprint config missing in D2', async () => {
      sprintModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(
        service.fetchAndVerify(GROUP_ID, SPRINT_ID, {}, 'coord-1'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 422 when sprint window is not active', async () => {
      const expiredConfig = {
        ...activeSprintConfig,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-02-01'),
      };
      sprintModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(expiredConfig) });

      await expect(
        service.fetchAndVerify(GROUP_ID, SPRINT_ID, {}, 'coord-1'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 404 NotFoundException when group has no members', async () => {
      jiraService.fetchStoryPoints.mockResolvedValue([]);
      userModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

      await expect(
        service.fetchAndVerify(GROUP_ID, SPRINT_ID, {}, 'coord-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('filters to given studentIds subset', async () => {
      jiraService.fetchStoryPoints.mockResolvedValue([
        { studentId: STUDENT_A, completedPoints: 6 },
      ]);

      const updatedA = { studentId: STUDENT_A, completedPoints: 6, targetPoints: 10, source: StoryPointSource.JIRA_GITHUB, updatedAt: NOW };
      recordModel.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(updatedA) });
      recordModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([updatedA]) });

      await service.fetchAndVerify(GROUP_ID, SPRINT_ID, { studentIds: [STUDENT_A] }, 'coord-1');

      expect(jiraService.fetchStoryPoints).toHaveBeenCalledWith(GROUP_ID, SPRINT_ID, [STUDENT_A]);
      expect(userModel.find).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // override
  // ──────────────────────────────────────────────
  describe('override', () => {
    it('happy path: upserts record with COORDINATOR_OVERRIDE source', async () => {
      const saved = {
        studentId: STUDENT_A,
        completedPoints: 15,
        targetPoints: 10,
        source: StoryPointSource.COORDINATOR_OVERRIDE,
        updatedAt: NOW,
      };
      recordModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      recordModel.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(saved) });

      const result = await service.override(
        GROUP_ID,
        SPRINT_ID,
        { studentId: STUDENT_A, completedPoints: 15 },
        'coord-1',
      );

      expect(result.source).toBe(StoryPointSource.COORDINATOR_OVERRIDE);
      expect(result.completedPoints).toBe(15);
    });

    it('throws 422 when sprint config is missing', async () => {
      sprintModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(
        service.override(GROUP_ID, SPRINT_ID, { studentId: STUDENT_A, completedPoints: 5 }, 'coord-1'),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ──────────────────────────────────────────────
  // getRecords
  // ──────────────────────────────────────────────
  describe('getRecords', () => {
    it('returns summary without modifying state', async () => {
      const records = [
        { studentId: STUDENT_A, completedPoints: 5, targetPoints: 10, source: StoryPointSource.JIRA_GITHUB, updatedAt: NOW },
      ];
      recordModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue(records) });

      const result = await service.getRecords(GROUP_ID, SPRINT_ID);

      expect(result.groupId).toBe(GROUP_ID);
      expect(result.records).toHaveLength(1);
      expect(recordModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('throws 422 when sprint config is missing', async () => {
      sprintModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.getRecords(GROUP_ID, SPRINT_ID)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });
});
