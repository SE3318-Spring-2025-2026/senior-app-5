import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { GradesService } from './grades.service';
import { GroupFinalGradeDto } from './dto/group-final-grade.dto';
import { StudentFinalGradeDto } from './dto/student-final-grade.dto';
import { ListGradeHistoryQueryDto } from './dto/list-grade-history-query.dto';
import { PaginatedGradeHistoryDto } from './dto/paginated-grade-history.dto';

interface RequestWithUser extends Request {
  user: { userId?: string; sub?: string; _id?: string; role: Role };
}

@ApiTags('Grades')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @ApiOperation({
    operationId: 'getGroupFinalGrade',
    summary: 'Get stored final grade for a group',
  })
  @ApiOkResponse({ type: GroupFinalGradeDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'No final grade calculated yet' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @Roles(Role.Coordinator, Role.Professor, Role.Admin)
  @Get('groups/:groupId/final-grade')
  async getGroupFinalGrade(
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ): Promise<GroupFinalGradeDto> {
    return this.gradesService.getGroupFinalGrade(groupId);
  }

  @ApiOperation({
    operationId: 'getStudentFinalGrade',
    summary: 'Get stored final grade for a student',
  })
  @ApiOkResponse({ type: StudentFinalGradeDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'No final grade calculated yet' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @Roles(Role.Coordinator, Role.Professor, Role.Admin, Role.Student)
  @Get('students/:studentId/final-grade')
  async getStudentFinalGrade(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Req() req: RequestWithUser,
  ): Promise<StudentFinalGradeDto> {
    const jwtStudentId = req.user.userId ?? req.user.sub ?? req.user._id;

    if (req.user.role === Role.Student && String(jwtStudentId) !== studentId) {
      throw new ForbiddenException("Cannot access another student's grade.");
    }

    return this.gradesService.getStudentFinalGrade(studentId);
  }

  @ApiOperation({
    operationId: 'getGradeHistory',
    summary: 'Get grade history snapshots for a group',
  })
  @ApiOkResponse({ type: PaginatedGradeHistoryDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'No grade history found' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @Roles(Role.Coordinator, Role.Admin)
  @Get('groups/:groupId/grade-history')
  async getGradeHistory(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Query() query: ListGradeHistoryQueryDto,
  ): Promise<PaginatedGradeHistoryDto> {
    return this.gradesService.getGradeHistory(groupId, query);
  }
}
