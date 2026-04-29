import { Injectable, NotFoundException } from '@nestjs/common';
import { GroupFinalGradeDto } from './dto/group-final-grade.dto';
import { StudentFinalGradeDto } from './dto/student-final-grade.dto';
import { ListGradeHistoryQueryDto } from './dto/list-grade-history-query.dto';
import { PaginatedGradeHistoryDto } from './dto/paginated-grade-history.dto';

@Injectable()
export class GradesService {
  getGroupFinalGrade(groupId: string): Promise<GroupFinalGradeDto> {
    void groupId;
    return Promise.reject(
      new NotFoundException('Final grade not found yet for this group.'),
    );
  }

  getStudentFinalGrade(studentId: string): Promise<StudentFinalGradeDto> {
    void studentId;
    return Promise.reject(
      new NotFoundException('Final grade not found yet for this student.'),
    );
  }

  getGradeHistory(
    groupId: string,
    query: ListGradeHistoryQueryDto,
  ): Promise<PaginatedGradeHistoryDto> {
    void groupId;
    void query;
    return Promise.reject(
      new NotFoundException('Grade history not found yet for this group.'),
    );
  }
}
