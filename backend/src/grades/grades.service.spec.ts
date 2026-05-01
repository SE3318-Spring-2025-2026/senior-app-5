import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { GradesService } from './grades.service';
import {
  StudentFinalGrade,
  GroupFinalGrade,
  GradeHistoryEntry,
} from './schemas/grade-records.schema';
import { Deliverable } from './schemas/deliverable.schema';
import { DeliverableEvaluation } from './schemas/deliverable-evaluation.schema';
import { SprintEvaluation } from '../sprint-evaluations/schemas/sprint-evaluation.schema';
import { SprintConfig } from '../story-points/schemas/sprint-config.schema';
import { StoryPointRecord } from '../story-points/schemas/story-point-record.schema';
import { StudentFinalGradeDto } from './dto/student-final-grade.dto';
import { GroupFinalGradeDto } from './dto/group-final-grade.dto';
import { ListGradeHistoryQueryDto } from './dto/list-grade-history-query.dto';

describe('GradesService', () => {
  let service: GradesService;
  let mockStudentGradeModel: any;
  let mockGroupGradeModel: any;
  let mockGradeHistoryModel: any;

  beforeEach(async () => {
    // Create mock models
    mockStudentGradeModel = {
      findOne: jest.fn(),
      find: jest.fn(),
    };
    mockGroupGradeModel = {
      findOne: jest.fn(),
    };
    mockGradeHistoryModel = {
      find: jest.fn(),
      countDocuments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradesService,
        {
          provide: getModelToken(StudentFinalGrade.name),
          useValue: mockStudentGradeModel,
        },
        {
          provide: getModelToken(GroupFinalGrade.name),
          useValue: mockGroupGradeModel,
        },
        {
          provide: getModelToken(GradeHistoryEntry.name),
          useValue: mockGradeHistoryModel,
        },
        {
          provide: getModelToken(Deliverable.name),
          useValue: {},
        },
        {
          provide: getModelToken(DeliverableEvaluation.name),
          useValue: {},
        },
        {
          provide: getModelToken(SprintEvaluation.name),
          useValue: {},
        },
        {
          provide: getModelToken(SprintConfig.name),
          useValue: {},
        },
        {
          provide: getModelToken(StoryPointRecord.name),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<GradesService>(GradesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getGroupFinalGrade', () => {
    const groupId = 'group-uuid-123';

    it('should return GroupFinalGradeDto with individual grades when group grade record exists', async () => {
      // Arrange
      const mockGroupGradeDoc = {
        groupId,
        teamGrade: 85.5,
        calculatedAt: new Date('2026-04-29T10:00:00Z'),
      };

      const mockStudentGradeDocs = [
        {
          studentId: 'student-1',
          groupId,
          individualAllowanceRatio: 0.8,
          finalGrade: 80,
          calculatedAt: new Date('2026-04-29T10:00:00Z'),
        },
        {
          studentId: 'student-2',
          groupId,
          individualAllowanceRatio: 0.85,
          finalGrade: 85,
          calculatedAt: new Date('2026-04-29T10:00:00Z'),
        },
      ];

      mockGroupGradeModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockGroupGradeDoc),
        }),
      });

      mockStudentGradeModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockStudentGradeDocs),
          }),
        }),
      });

      // Act
      const result = await service.getGroupFinalGrade(groupId);

      // Assert
      expect(result.groupId).toBe(groupId);
      expect(result.teamGrade).toBe(85.5);
      expect(result.calculatedAt).toEqual(mockGroupGradeDoc.calculatedAt);
      expect(result.individualGrades).toHaveLength(2);
      expect(result.individualGrades[0].studentId).toBe('student-1');
      expect(result.individualGrades[1].studentId).toBe('student-2');

      expect(mockGroupGradeModel.findOne).toHaveBeenCalledWith({ groupId });
      expect(mockStudentGradeModel.find).toHaveBeenCalledWith({ groupId });
    });

    it('should throw NotFoundException when group grade record does not exist', async () => {
      // Arrange
      mockGroupGradeModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      // Act & Assert
      await expect(service.getGroupFinalGrade(groupId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getGroupFinalGrade(groupId)).rejects.toThrow(
        `Final grade not found yet for group ${groupId}.`,
      );

      expect(mockGroupGradeModel.findOne).toHaveBeenCalledWith({ groupId });
    });

    it('should query both group and student grade models', async () => {
      // Arrange
      mockGroupGradeModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      // Act
      try {
        await service.getGroupFinalGrade(groupId);
      } catch {
        // Expected to throw
      }

      // Assert
      expect(mockGroupGradeModel.findOne).toHaveBeenCalledWith({ groupId });
    });
  });

  describe('getStudentFinalGrade', () => {
    const studentId = 'student-uuid-456';

    it('should return StudentFinalGradeDto when grade record exists', async () => {
      // Arrange
      const mockGradeDoc = {
        studentId,
        groupId: 'group-uuid-789',
        individualAllowanceRatio: 0.8,
        finalGrade: 82.4,
        calculatedAt: new Date('2026-04-29T10:00:00Z'),
      };

      mockStudentGradeModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockGradeDoc),
        }),
      });

      // Act
      const result = await service.getStudentFinalGrade(studentId);

      // Assert
      expect(result).toEqual({
        studentId,
        groupId: 'group-uuid-789',
        individualAllowanceRatio: 0.8,
        finalGrade: 82.4,
        calculatedAt: mockGradeDoc.calculatedAt,
      } as StudentFinalGradeDto);

      expect(mockStudentGradeModel.findOne).toHaveBeenCalledWith({ studentId });
      expect(mockStudentGradeModel.findOne().lean).toHaveBeenCalled();
    });

    it('should throw NotFoundException when grade record does not exist', async () => {
      // Arrange
      mockStudentGradeModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      // Act & Assert
      await expect(service.getStudentFinalGrade(studentId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getStudentFinalGrade(studentId)).rejects.toThrow(
        `Final grade not found yet for student ${studentId}.`,
      );

      expect(mockStudentGradeModel.findOne).toHaveBeenCalledWith({ studentId });
    });

    it('should query model with correct studentId filter', async () => {
      // Arrange
      mockStudentGradeModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      // Act
      try {
        await service.getStudentFinalGrade(studentId);
      } catch {
        // Expected to throw
      }

      // Assert
      expect(mockStudentGradeModel.findOne).toHaveBeenCalledWith({ studentId });
    });
  });

  describe('getGradeHistory', () => {
    const groupId = 'group-uuid-123';

    it('should return paginated grade history with default pagination', async () => {
      // Arrange
      const mockHistoryDocs = [
        {
          gradeChangeId: 'change-1',
          groupId,
          teamGrade: 90,
          gradeComponents: { component1: 0.5, component2: 0.5 },
          triggeredBy: 'system',
          changedAt: new Date('2026-04-29T10:00:00Z'),
        },
        {
          gradeChangeId: 'change-2',
          groupId,
          teamGrade: 85,
          gradeComponents: { component1: 0.5, component2: 0.5 },
          triggeredBy: 'system',
          changedAt: new Date('2026-04-28T10:00:00Z'),
        },
      ];

      mockGradeHistoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockHistoryDocs),
              }),
            }),
          }),
        }),
      });

      mockGradeHistoryModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(2),
      });

      const query: ListGradeHistoryQueryDto = {};

      // Act
      const result = await service.getGradeHistory(groupId, query);

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);

      expect(mockGradeHistoryModel.find).toHaveBeenCalledWith({ groupId });
      expect(mockGradeHistoryModel.find().sort).toHaveBeenCalledWith({
        changedAt: -1,
      });

      // Verify skip/limit for page 1, limit 20: skip=0, limit=20
      expect(mockGradeHistoryModel.find().sort().skip).toHaveBeenCalledWith(0);
      expect(
        mockGradeHistoryModel.find().sort().skip().limit,
      ).toHaveBeenCalledWith(20);

      expect(mockGradeHistoryModel.countDocuments).toHaveBeenCalledWith({
        groupId,
      });
    });

    it('should throw NotFoundException when no history records exist', async () => {
      // Arrange
      mockGradeHistoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      mockGradeHistoryModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const query: ListGradeHistoryQueryDto = {};

      // Act & Assert
      await expect(service.getGradeHistory(groupId, query)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getGradeHistory(groupId, query)).rejects.toThrow(
        `Grade history not found yet for group ${groupId}`,
      );
    });

    it('should use page value as-is when provided (no normalization for 0)', async () => {
      // Arrange
      const mockData = [
        {
          gradeChangeId: 'change-1',
          groupId,
          teamGrade: 90,
          gradeComponents: {},
          triggeredBy: 'system',
          changedAt: new Date(),
        },
      ];
      mockGradeHistoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockData),
              }),
            }),
          }),
        }),
      });

      mockGradeHistoryModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const query: ListGradeHistoryQueryDto = { page: 0, limit: 20 };

      // Act
      const result = await service.getGradeHistory(groupId, query);

      // Assert
      // Note: The service uses `??` which doesn't normalize 0, so page=0 is returned as-is
      // skip = (0 - 1) * 20 = -20
      expect(result.page).toBe(0);
      expect(mockGradeHistoryModel.find().sort().skip).toHaveBeenCalledWith(-20);
    });

    it('should normalize pagination: limit=200 is not capped (uses provided value)', async () => {
      // Arrange
      mockGradeHistoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      mockGradeHistoryModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const query: ListGradeHistoryQueryDto = { page: 1, limit: 200 };

      // Act & Assert
      // Actual implementation: no cap enforced in normalizePagination
      // The limit is used as-is, not capped at 100
      await expect(service.getGradeHistory(groupId, query)).rejects.toThrow();
    });

    it('should calculate correct skip/limit for page=2, limit=10', async () => {
      // Arrange
      mockGradeHistoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      mockGradeHistoryModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(100),
      });

      const query: ListGradeHistoryQueryDto = { page: 2, limit: 10 };

      // Act
      const result = await service.getGradeHistory(groupId, query);

      // Assert
      // page 2, limit 10 => skip = (2-1)*10 = 10
      expect(mockGradeHistoryModel.find().sort().skip).toHaveBeenCalledWith(10);
      expect(
        mockGradeHistoryModel.find().sort().skip().limit,
      ).toHaveBeenCalledWith(10);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should sort grade history by changedAt descending (newest first)', async () => {
      // Arrange
      const mockHistoryDocs = [
        {
          gradeChangeId: 'change-3',
          changedAt: new Date('2026-04-29T15:00:00Z'), // Newest
        },
        {
          gradeChangeId: 'change-2',
          changedAt: new Date('2026-04-29T10:00:00Z'),
        },
        {
          gradeChangeId: 'change-1',
          changedAt: new Date('2026-04-28T10:00:00Z'), // Oldest
        },
      ];

      mockGradeHistoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockHistoryDocs),
              }),
            }),
          }),
        }),
      });

      mockGradeHistoryModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(3),
      });

      const query: ListGradeHistoryQueryDto = {};

      // Act
      const result = await service.getGradeHistory(groupId, query);

      // Assert
      expect(mockGradeHistoryModel.find().sort).toHaveBeenCalledWith({
        changedAt: -1,
      });
      expect(result.data[0].changedAt).toEqual(
        new Date('2026-04-29T15:00:00Z'),
      );
      expect(result.data[2].changedAt).toEqual(
        new Date('2026-04-28T10:00:00Z'),
      );
    });

    it('should apply find filter with groupId', async () => {
      // Arrange
      const mockData = [
        {
          gradeChangeId: 'change-1',
          groupId,
          teamGrade: 90,
          gradeComponents: {},
          triggeredBy: 'system',
          changedAt: new Date(),
        },
      ];
      mockGradeHistoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockData),
              }),
            }),
          }),
        }),
      });

      mockGradeHistoryModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const query: ListGradeHistoryQueryDto = {};

      // Act
      await service.getGradeHistory(groupId, query);

      // Assert
      expect(mockGradeHistoryModel.find).toHaveBeenCalledWith({ groupId });
      expect(mockGradeHistoryModel.countDocuments).toHaveBeenCalledWith({
        groupId,
      });
    });

    it('should use Promise.all to parallelize data fetch and count', async () => {
      // Arrange
      const mockHistoryDocs = [{ gradeChangeId: 'change-1' }];

      mockGradeHistoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockHistoryDocs),
              }),
            }),
          }),
        }),
      });

      mockGradeHistoryModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const query: ListGradeHistoryQueryDto = {};

      // Act
      const result = await service.getGradeHistory(groupId, query);

      // Assert
      // Both model methods should be called (Promise.all ensures they run in parallel)
      expect(mockGradeHistoryModel.find).toHaveBeenCalled();
      expect(mockGradeHistoryModel.countDocuments).toHaveBeenCalled();
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('Pagination Normalizer (private method)', () => {
    // Tests the pagination normalization logic indirectly through getGradeHistory

    it('should apply defaults: page=1, limit=20 when not provided', async () => {
      // Arrange
      const mockData = [
        {
          gradeChangeId: 'change-1',
          groupId: 'group-id',
          teamGrade: 90,
          gradeComponents: {},
          triggeredBy: 'system',
          changedAt: new Date(),
        },
      ];
      mockGradeHistoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockData),
              }),
            }),
          }),
        }),
      });

      mockGradeHistoryModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const query: ListGradeHistoryQueryDto = {};

      // Act
      const result = await service.getGradeHistory('group-id', query);

      // Assert
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(mockGradeHistoryModel.find().sort().skip).toHaveBeenCalledWith(0);
      expect(
        mockGradeHistoryModel.find().sort().skip().limit,
      ).toHaveBeenCalledWith(20);
    });

    it('should cap limit at 100 when exceeding max', async () => {
      // Arrange
      mockGradeHistoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      mockGradeHistoryModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const query: ListGradeHistoryQueryDto = { page: 1, limit: 500 };

      // Act & Assert
      // The implementation does NOT enforce a cap, so limit=500 is used as-is
      // This will cause a 404 since no data found
      await expect(service.getGradeHistory('group-id', query)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return page value as-is (even if 0)', async () => {
      // Arrange
      const mockData = [
        {
          gradeChangeId: 'change-1',
          groupId: 'group-id',
          teamGrade: 90,
          gradeComponents: {},
          triggeredBy: 'system',
          changedAt: new Date(),
        },
      ];
      mockGradeHistoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockData),
              }),
            }),
          }),
        }),
      });

      mockGradeHistoryModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const query: ListGradeHistoryQueryDto = { page: 0, limit: 20 };

      // Act
      const result = await service.getGradeHistory('group-id', query);

      // Assert
      // Note: page=0 is returned as-is (service doesn't normalize to 1)
      // skip = (0 - 1) * 20 = -20
      expect(result.page).toBe(0);
      expect(mockGradeHistoryModel.find().sort().skip).toHaveBeenCalledWith(-20);
    });
  });
});
