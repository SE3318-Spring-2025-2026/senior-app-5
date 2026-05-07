import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GradesController } from './grades.controller';
import { GradesService } from './grades.service';
import { GroupFinalGradeDto } from './dto/group-final-grade.dto';
import { PaginatedGradeHistoryDto } from './dto/paginated-grade-history.dto';
import { StudentFinalGradeDto } from './dto/student-final-grade.dto';
import { Role } from '../auth/enums/role.enum';

describe('GradesController', () => {
  let controller: GradesController;

  const mockService = {
    getGroupFinalGrade: jest.fn(),
    getStudentFinalGrade: jest.fn(),
    getGradeHistory: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GradesController],
      providers: [
        {
          provide: GradesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<GradesController>(GradesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getGroupFinalGrade', () => {
    it('passes the groupId to the service and returns its result', async () => {
      const response: GroupFinalGradeDto = {
        groupId: '11111111-1111-1111-1111-111111111111',
        teamGrade: 78.4,
        individualGrades: [],
        calculatedAt: new Date('2026-04-29T10:00:00.000Z'),
      };
      const groupGradeMock = mockService.getGroupFinalGrade;
      groupGradeMock.mockResolvedValue(response);

      const result = await controller.getGroupFinalGrade(
        '11111111-1111-1111-1111-111111111111',
      );

      expect(result).toEqual(response);
      expect(groupGradeMock).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
      );
    });
  });

  describe('getStudentFinalGrade', () => {
    it('allows a STUDENT to read their own final grade', async () => {
      const response: StudentFinalGradeDto = {
        studentId: '22222222-2222-2222-2222-222222222222',
        groupId: '11111111-1111-1111-1111-111111111111',
        individualAllowanceRatio: 0.9,
        finalGrade: 70.56,
        calculatedAt: new Date('2026-04-29T10:00:00.000Z'),
      };
      const studentGradeMock = mockService.getStudentFinalGrade;
      studentGradeMock.mockResolvedValue(response);

      const req = {
        user: {
          userId: '22222222-2222-2222-2222-222222222222',
          role: Role.Student,
        },
        headers: {},
      } as unknown as Parameters<GradesController['getStudentFinalGrade']>[1];

      const result = await controller.getStudentFinalGrade(
        '22222222-2222-2222-2222-222222222222',
        req,
      );

      expect(result).toEqual(response);
      expect(studentGradeMock).toHaveBeenCalledWith(
        '22222222-2222-2222-2222-222222222222',
      );
    });

    it("rejects a STUDENT trying to read another student's grade", async () => {
      const req = {
        user: {
          userId: '22222222-2222-2222-2222-222222222222',
          role: Role.Student,
        },
        headers: { 'x-correlation-id': 'corr-123' },
      } as unknown as Parameters<GradesController['getStudentFinalGrade']>[1];

      await expect(
        controller.getStudentFinalGrade(
          '33333333-3333-3333-3333-333333333333',
          req,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockService.getStudentFinalGrade).not.toHaveBeenCalled();
    });
  });

  describe('getGradeHistory', () => {
    it('passes the groupId and query to the service', async () => {
      const response: PaginatedGradeHistoryDto = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      };
      const gradeHistoryMock = mockService.getGradeHistory;
      gradeHistoryMock.mockResolvedValue(response);

      const result = await controller.getGradeHistory(
        '11111111-1111-1111-1111-111111111111',
        { page: 1, limit: 20 },
      );

      expect(result).toEqual(response);
      expect(gradeHistoryMock).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        { page: 1, limit: 20 },
      );
    });
  });
});
