import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../auth/enums/role.enum';
import { StoryPointSource } from './schemas/story-point-record.schema';
import { StoryPointsController } from './story-points.controller';
import { StoryPointsService } from './story-points.service';
import { StoryPointSummaryDto, StudentStoryPointRecordDto } from './dto/story-point-summary.dto';

const GROUP_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const SPRINT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const STUDENT_A = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const NOW = new Date('2026-04-30T12:00:00Z');

const mockSummary: StoryPointSummaryDto = {
  groupId: GROUP_ID,
  sprintId: SPRINT_ID,
  records: [
    { studentId: STUDENT_A, completedPoints: 5, targetPoints: 10, source: StoryPointSource.JIRA_GITHUB, updatedAt: NOW },
  ],
};

const mockRecord: StudentStoryPointRecordDto = {
  studentId: STUDENT_A,
  completedPoints: 15,
  targetPoints: 10,
  source: StoryPointSource.COORDINATOR_OVERRIDE,
  updatedAt: NOW,
};

describe('StoryPointsController', () => {
  let controller: StoryPointsController;

  const mockService = {
    fetchAndVerify: jest.fn(),
    getRecords: jest.fn(),
    override: jest.fn(),
  };

  const coordinatorReq: any = { user: { userId: 'coord-1', role: Role.Coordinator } };
  const professorReq: any = { user: { userId: 'prof-1', role: Role.Professor } };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoryPointsController],
      providers: [{ provide: StoryPointsService, useValue: mockService }],
    }).compile();

    controller = module.get<StoryPointsController>(StoryPointsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // POST fetchAndVerify
  // ──────────────────────────────────────────────
  describe('fetchAndVerify (POST)', () => {
    it('200: returns StoryPointSummary shape', async () => {
      mockService.fetchAndVerify.mockResolvedValue(mockSummary);

      const result = await controller.fetchAndVerify(GROUP_ID, SPRINT_ID, {}, coordinatorReq);

      expect(result).toEqual(mockSummary);
      expect(mockService.fetchAndVerify).toHaveBeenCalledWith(GROUP_ID, SPRINT_ID, {}, 'coord-1');
    });

    it('200: ADVISOR (Professor) can trigger fetch', async () => {
      mockService.fetchAndVerify.mockResolvedValue(mockSummary);

      const result = await controller.fetchAndVerify(GROUP_ID, SPRINT_ID, {}, professorReq);
      expect(result).toEqual(mockSummary);
    });

    it('502: propagates BadGatewayException from service', async () => {
      mockService.fetchAndVerify.mockRejectedValue(new BadGatewayException('JIRA/GitHub API unreachable'));

      await expect(
        controller.fetchAndVerify(GROUP_ID, SPRINT_ID, {}, coordinatorReq),
      ).rejects.toThrow(BadGatewayException);
    });

    it('422: propagates UnprocessableEntityException from service', async () => {
      mockService.fetchAndVerify.mockRejectedValue(
        new UnprocessableEntityException('Sprint config missing'),
      );

      await expect(
        controller.fetchAndVerify(GROUP_ID, SPRINT_ID, {}, coordinatorReq),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ──────────────────────────────────────────────
  // GET getStoryPoints
  // ──────────────────────────────────────────────
  describe('getStoryPoints (GET)', () => {
    it('200: returns StoryPointSummary', async () => {
      mockService.getRecords.mockResolvedValue(mockSummary);

      const result = await controller.getStoryPoints(GROUP_ID, SPRINT_ID);

      expect(result).toEqual(mockSummary);
    });
  });

  // ──────────────────────────────────────────────
  // PATCH overrideStoryPoints
  // ──────────────────────────────────────────────
  describe('overrideStoryPoints (PATCH)', () => {
    it('200: returns single StudentStoryPointRecord with COORDINATOR_OVERRIDE source', async () => {
      mockService.override.mockResolvedValue(mockRecord);

      const result = await controller.overrideStoryPoints(
        GROUP_ID,
        SPRINT_ID,
        { studentId: STUDENT_A, completedPoints: 15 },
        coordinatorReq,
      );

      expect(result).toEqual(mockRecord);
      expect(result.source).toBe(StoryPointSource.COORDINATOR_OVERRIDE);
    });

    it('403: ForbiddenException when ADVISOR attempts PATCH override', async () => {
      mockService.override.mockRejectedValue(new ForbiddenException('Insufficient permissions'));

      await expect(
        controller.overrideStoryPoints(GROUP_ID, SPRINT_ID, { studentId: STUDENT_A, completedPoints: 5 }, professorReq),
      ).rejects.toThrow(ForbiddenException);
    });

    it('propagates 422 when sprint config missing', async () => {
      mockService.override.mockRejectedValue(new UnprocessableEntityException('Sprint config missing'));

      await expect(
        controller.overrideStoryPoints(GROUP_ID, SPRINT_ID, { studentId: STUDENT_A, completedPoints: 5 }, coordinatorReq),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ──────────────────────────────────────────────
  // 401: Simulated missing JWT (guard behaviour)
  // ──────────────────────────────────────────────
  describe('401 simulation (guard)', () => {
    it('fetchAndVerify rejects when service throws UnauthorizedException', async () => {
      mockService.fetchAndVerify.mockRejectedValue(new UnauthorizedException());
      await expect(
        controller.fetchAndVerify(GROUP_ID, SPRINT_ID, {}, coordinatorReq),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('getStoryPoints rejects when service throws UnauthorizedException', async () => {
      mockService.getRecords.mockRejectedValue(new UnauthorizedException());
      await expect(controller.getStoryPoints(GROUP_ID, SPRINT_ID)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('overrideStoryPoints rejects when service throws UnauthorizedException', async () => {
      mockService.override.mockRejectedValue(new UnauthorizedException());
      await expect(
        controller.overrideStoryPoints(GROUP_ID, SPRINT_ID, { studentId: STUDENT_A, completedPoints: 5 }, coordinatorReq),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ──────────────────────────────────────────────
  // 400: negative completedPoints — DTO validation (service-level check)
  // ──────────────────────────────────────────────
  describe('400 validation', () => {
    it('propagates BadRequestException for negative completedPoints', async () => {
      mockService.override.mockRejectedValue(new BadRequestException('completedPoints must not be less than 0'));

      await expect(
        controller.overrideStoryPoints(
          GROUP_ID,
          SPRINT_ID,
          { studentId: STUDENT_A, completedPoints: -1 },
          coordinatorReq,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ──────────────────────────────────────────────
  // RBAC metadata checks
  // ──────────────────────────────────────────────
  describe('RBAC metadata', () => {
    it('fetchAndVerify allows Coordinator and Professor', () => {
      const roles = Reflect.getMetadata('roles', controller.fetchAndVerify);
      expect(roles).toEqual(expect.arrayContaining([Role.Coordinator, Role.Professor]));
    });

    it('getStoryPoints allows Coordinator and Professor', () => {
      const roles = Reflect.getMetadata('roles', controller.getStoryPoints);
      expect(roles).toEqual(expect.arrayContaining([Role.Coordinator, Role.Professor]));
    });

    it('overrideStoryPoints allows only Coordinator', () => {
      const roles = Reflect.getMetadata('roles', controller.overrideStoryPoints);
      expect(roles).toEqual([Role.Coordinator]);
      expect(roles).not.toContain(Role.Professor);
    });
  });
});
