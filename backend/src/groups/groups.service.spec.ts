import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { Group, GroupStatus } from './group.entity';
import { Submission } from '../submissions/schemas/submission.schema';
import { CommitteeEvaluation, EvaluationGrade } from './schemas/committee-evaluation.schema';
import { CommitteeGradeStatus } from './dto/committee-grade-result.dto';
import { Committee } from '../committees/schemas/committee.schema';

describe('GroupsService', () => {
  let service: GroupsService;
  let mockGroupModel: any;
  let mockSubmissionModel: any;
  let mockEvaluationModel: any;
  let mockCommitteeModel: any;

  beforeEach(async () => {
    const mockGroup = {
      groupId: 'test-uuid',
      groupName: 'Test Group',
      leaderUserId: '123e4567-e89b-12d3-a456-426614174000',
      status: GroupStatus.ACTIVE,
      save: jest.fn().mockResolvedValue({
        groupId: 'test-uuid',
        groupName: 'Test Group',
        leaderUserId: '123e4567-e89b-12d3-a456-426614174000',
        status: GroupStatus.ACTIVE,
      }),
    };

    mockGroupModel = jest.fn().mockImplementation(() => mockGroup);
    mockSubmissionModel = { find: jest.fn() };
    mockEvaluationModel = { find: jest.fn() };
    mockCommitteeModel = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: getModelToken(Group.name), useValue: mockGroupModel },
        { provide: getModelToken(Submission.name), useValue: mockSubmissionModel },
        { provide: getModelToken('User'), useValue: jest.fn() },
        { provide: getModelToken(CommitteeEvaluation.name), useValue: mockEvaluationModel },
        { provide: getModelToken(Committee.name), useValue: mockCommitteeModel },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a group', async () => {
    const createGroupDto = {
      groupName: 'Test Group',
      leaderUserId: '123e4567-e89b-12d3-a456-426614174000',
    };

    const result = await service.createGroup(createGroupDto);

    expect(result).toBeDefined();
    expect(result.groupName).toBe('Test Group');
    expect(result.leaderUserId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(result.status).toBe(GroupStatus.ACTIVE);
    expect(result.groupId).toBeDefined();
  });

  describe('getCommitteeGrade', () => {
    const groupId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const deliverableId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const submissionId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

    const makeEvaluations = (grades: EvaluationGrade[]) =>
      grades.map((grade, i) => ({
        groupId,
        deliverableId,
        submissionId,
        memberId: `member-${i}`,
        grade,
      }));

    it('returns correct averageGrade from mock committee records', async () => {
      const evals = makeEvaluations([EvaluationGrade.A, EvaluationGrade.B, EvaluationGrade.C]);
      mockEvaluationModel.find.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(evals) }) });
      mockCommitteeModel.findOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) });

      const result = await service.getCommitteeGrade(groupId, deliverableId);

      // A=4, B=3, C=2 → avg = 3
      expect(result.averageGrade).toBeCloseTo(3);
      expect(result.committeeGradeList).toHaveLength(3);
      expect(result.groupId).toBe(groupId);
      expect(result.deliverableId).toBe(deliverableId);
      expect(result.submissionId).toBe(submissionId);
    });

    it('maps grade enum to numeric correctly (A=4, B=3, C=2, D=1, F=0)', async () => {
      const evals = makeEvaluations([EvaluationGrade.A, EvaluationGrade.B, EvaluationGrade.C, EvaluationGrade.D, EvaluationGrade.F]);
      mockEvaluationModel.find.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(evals) }) });
      mockCommitteeModel.findOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) });

      const result = await service.getCommitteeGrade(groupId, deliverableId);

      // 4+3+2+1+0 = 10 / 5 = 2
      expect(result.averageGrade).toBeCloseTo(2);
    });

    it('returns status=PENDING when not all jury members have submitted', async () => {
      const evals = makeEvaluations([EvaluationGrade.A]);
      mockEvaluationModel.find.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(evals) }) });
      // committee has 2 jury members but only 1 has submitted
      mockCommitteeModel.findOne.mockReturnValue({
        lean: () => ({
          exec: () =>
            Promise.resolve({ jury: [{ userId: 'member-0' }, { userId: 'member-1' }] }),
        }),
      });

      const result = await service.getCommitteeGrade(groupId, deliverableId);

      expect(result.status).toBe(CommitteeGradeStatus.PENDING);
    });

    it('returns status=GRADED when all jury members have submitted', async () => {
      const evals = [
        { groupId, deliverableId, submissionId, memberId: 'member-0', grade: EvaluationGrade.A },
        { groupId, deliverableId, submissionId, memberId: 'member-1', grade: EvaluationGrade.B },
      ];
      mockEvaluationModel.find.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(evals) }) });
      mockCommitteeModel.findOne.mockReturnValue({
        lean: () => ({
          exec: () =>
            Promise.resolve({ jury: [{ userId: 'member-0' }, { userId: 'member-1' }] }),
        }),
      });

      const result = await service.getCommitteeGrade(groupId, deliverableId);

      expect(result.status).toBe(CommitteeGradeStatus.GRADED);
    });

    it('returns status=PENDING when no committee is found', async () => {
      const evals = makeEvaluations([EvaluationGrade.A]);
      mockEvaluationModel.find.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(evals) }) });
      mockCommitteeModel.findOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) });

      const result = await service.getCommitteeGrade(groupId, deliverableId);

      expect(result.status).toBe(CommitteeGradeStatus.PENDING);
    });

    it('throws NotFoundException when no evaluation records exist', async () => {
      mockEvaluationModel.find.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve([]) }) });

      await expect(service.getCommitteeGrade(groupId, deliverableId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws InternalServerErrorException on unexpected DB failure', async () => {
      mockEvaluationModel.find.mockReturnValue({
        lean: () => ({ exec: () => Promise.reject(new Error('db crash')) }),
      });

      await expect(service.getCommitteeGrade(groupId, deliverableId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
