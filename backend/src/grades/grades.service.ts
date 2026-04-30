import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GroupFinalGradeDto } from './dto/group-final-grade.dto';
import { GradeHistoryEntryDto } from './dto/grade-history-entry.dto';
import { StudentFinalGradeDto } from './dto/student-final-grade.dto';
import { ListGradeHistoryQueryDto } from './dto/list-grade-history-query.dto';
import { PaginatedGradeHistoryDto } from './dto/paginated-grade-history.dto';
import {
  GradeHistoryEntry,
  GradeHistoryEntryDocument,
  GroupFinalGrade,
  GroupFinalGradeDocument,
  StudentFinalGrade,
  StudentFinalGradeDocument,
} from './schemas/grade-records.schema';

@Injectable()
export class GradesService {
  constructor(
    @InjectModel(GroupFinalGrade.name)
    private readonly groupFinalGradeModel: Model<GroupFinalGradeDocument>,
    @InjectModel(StudentFinalGrade.name)
    private readonly studentFinalGradeModel: Model<StudentFinalGradeDocument>,
    @InjectModel(GradeHistoryEntry.name)
    private readonly gradeHistoryEntryModel: Model<GradeHistoryEntryDocument>,
  ) {}

  async getGroupFinalGrade(groupId: string): Promise<GroupFinalGradeDto> {
    try {
      const groupGrade = await this.groupFinalGradeModel
        .findOne({ groupId })
        .lean()
        .exec();

      if (!groupGrade) {
        throw new NotFoundException(this.buildGroupNotFoundMessage(groupId));
      }

      const individualGrades = await this.studentFinalGradeModel
        .find({ groupId })
        .sort({ studentId: 1 })
        .lean()
        .exec();

      return {
        groupId: groupGrade.groupId,
        teamGrade: groupGrade.teamGrade,
        individualGrades: individualGrades.map((grade) =>
          this.toStudentFinalGradeDto(grade),
        ),
        calculatedAt: groupGrade.calculatedAt,
      };
    } catch (error) {
      this.rethrowKnownErrors(error, this.buildGroupNotFoundMessage(groupId));
    }
  }

  async getStudentFinalGrade(studentId: string): Promise<StudentFinalGradeDto> {
    try {
      const studentGrade = await this.studentFinalGradeModel
        .findOne({ studentId })
        .lean()
        .exec();

      if (!studentGrade) {
        throw new NotFoundException(
          this.buildStudentNotFoundMessage(studentId),
        );
      }

      return this.toStudentFinalGradeDto(studentGrade);
    } catch (error) {
      this.rethrowKnownErrors(
        error,
        this.buildStudentNotFoundMessage(studentId),
      );
    }
  }

  async getGradeHistory(
    groupId: string,
    query: ListGradeHistoryQueryDto,
  ): Promise<PaginatedGradeHistoryDto> {
    const pagination = this.normalizePagination(query);

    try {
      const skip = (pagination.page - 1) * pagination.limit;

      const [data, total] = await Promise.all([
        this.gradeHistoryEntryModel
          .find({ groupId })
          .sort({ changedAt: -1 })
          .skip(skip)
          .limit(pagination.limit)
          .lean()
          .exec(),
        this.gradeHistoryEntryModel.countDocuments({ groupId }).exec(),
      ]);

      if (!total) {
        throw new NotFoundException(
          this.buildHistoryNotFoundMessage(
            groupId,
            pagination.page,
            pagination.limit,
          ),
        );
      }

      return {
        data: data.map((entry) => this.toGradeHistoryEntryDto(entry)),
        total,
        page: pagination.page,
        limit: pagination.limit,
      };
    } catch (error) {
      this.rethrowKnownErrors(
        error,
        this.buildHistoryNotFoundMessage(
          groupId,
          pagination.page,
          pagination.limit,
        ),
      );
    }
  }

  private rethrowKnownErrors(error: unknown, message: string): never {
    if (error instanceof NotFoundException) {
      throw error;
    }

    throw new InternalServerErrorException(
      `Failed to retrieve grades: ${message}`,
    );
  }

  private normalizePagination(query: ListGradeHistoryQueryDto): {
    page: number;
    limit: number;
  } {
    return {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    };
  }

  private buildGroupNotFoundMessage(groupId: string): string {
    return `Final grade not found yet for group ${groupId}.`;
  }

  private buildStudentNotFoundMessage(studentId: string): string {
    return `Final grade not found yet for student ${studentId}.`;
  }

  private buildHistoryNotFoundMessage(
    groupId: string,
    page: number,
    limit: number,
  ): string {
    return `Grade history not found yet for group ${groupId} (page ${page}, limit ${limit}).`;
  }

  private toStudentFinalGradeDto(
    studentGrade: StudentFinalGrade,
  ): StudentFinalGradeDto {
    return {
      studentId: studentGrade.studentId,
      groupId: studentGrade.groupId,
      individualAllowanceRatio: studentGrade.individualAllowanceRatio,
      finalGrade: studentGrade.finalGrade,
      calculatedAt: studentGrade.calculatedAt,
    };
  }

  private toGradeHistoryEntryDto(
    gradeHistoryEntry: GradeHistoryEntry,
  ): GradeHistoryEntryDto {
    return {
      gradeChangeId: gradeHistoryEntry.gradeChangeId,
      groupId: gradeHistoryEntry.groupId,
      teamGrade: gradeHistoryEntry.teamGrade,
      gradeComponents: gradeHistoryEntry.gradeComponents,
      triggeredBy: gradeHistoryEntry.triggeredBy,
      changedAt: gradeHistoryEntry.changedAt,
    };
  }
}
