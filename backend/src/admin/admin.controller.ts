import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { MoveStudentDto } from './dto/move-student.dto';
import { SanitizeGroupsDto } from './dto/sanitize-groups.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ListActivityLogsQueryDto } from '../activity-logs/dto/list-activity-logs-query.dto';
import { PaginatedActivityLogsDto } from '../activity-logs/dto/paginated-activity-logs.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import type { Request } from 'express';

type RequestWithUser = Request & {
  user?: {
    userId?: string;
    role?: string;
  };
};

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  @Patch('students/:studentId/group')
  @Roles(Role.Coordinator, Role.Admin)
  @ApiOperation({ summary: 'Move a student to a different group' })
  async moveStudentToGroup(
    @Req() req: RequestWithUser,
    @Param('studentId') studentId: string,
    @Body() body: MoveStudentDto,
  ) {
    const updatedUser = await this.adminService.moveStudentToGroup(
      studentId,
      body.groupId,
    );
    await this.activityLogsService.create({
      eventType: 'ADMIN_STUDENT_MOVED_GROUP',
      summary: 'Student moved to another group',
      actorUserId: req.user?.userId,
      actorRole: req.user?.role,
      targetType: 'user',
      targetId: studentId,
      metadata: {
        newGroupId: body.groupId,
      },
    });
    return updatedUser;
  }

  @Get('advisor-validation')
  @Roles(Role.Coordinator, Role.Admin)
  @ApiOperation({ summary: 'Check group-advisor assignment health' })
  async getAdvisorValidation() {
    return this.adminService.getAdvisorValidation();
  }

  @Post('sanitization/execute')
  @Roles(Role.Coordinator, Role.Admin)
  @ApiOperation({ summary: 'Clean up groups without advisors (Destructive)' })
  async executeSanitization(
    @Req() req: RequestWithUser,
    @Body() body: SanitizeGroupsDto,
  ) {
    const result = await this.adminService.executeSanitization(
      body.sanitizationRunDateTime,
    );
    await this.activityLogsService.create({
      eventType: 'ADMIN_GROUP_SANITIZATION_EXECUTED',
      summary: 'Group sanitization executed',
      actorUserId: req.user?.userId,
      actorRole: req.user?.role,
      targetType: 'group',
      targetId: 'sanitization',
      metadata: {
        deletedGroupsCount: (result as Record<string, unknown>)
          .deletedGroupsCount,
      },
    });
    return result;
  }

  @Get('activity')
  @Roles(Role.Coordinator, Role.Admin)
  @ApiOperation({
    operationId: 'getAdminActivityLogs',
    summary: 'List admin activity logs (paginated, filterable)',
  })
  @ApiOkResponse({ type: PaginatedActivityLogsDto })
  async getActivityLogs(
    @Query() query: ListActivityLogsQueryDto,
  ): Promise<PaginatedActivityLogsDto> {
    return this.adminService.getActivityLogs(query);
  }

  @Post('users/:userId/send-password-reset')
  @Roles(Role.Admin, Role.Coordinator)
  @ApiOperation({ summary: 'Send a password reset link to a specific user' })
  async sendPasswordReset(
    @Req() req: RequestWithUser,
    @Param('userId') userId: string,
  ) {
    const result = await this.adminService.sendPasswordResetForUser(userId);
    await this.activityLogsService.create({
      eventType: 'ADMIN_PASSWORD_RESET_SENT',
      summary: 'Admin sent password reset email',
      actorUserId: req.user?.userId,
      actorRole: req.user?.role,
      targetType: 'user',
      targetId: userId,
    });
    return result;
  }

  @Patch('users/:userId/role')
  @Roles(Role.Coordinator, Role.Admin)
  @ApiOperation({ summary: "Update a user's role" })
  async updateUserRole(
    @Req() req: RequestWithUser,
    @Param('userId') userId: string,
    @Body() body: UpdateUserRoleDto,
  ) {
    const result = await this.adminService.updateUserRole(userId, body.role);
    await this.activityLogsService.create({
      eventType: 'ADMIN_USER_ROLE_UPDATED',
      summary: 'User role updated',
      actorUserId: req.user?.userId,
      actorRole: req.user?.role,
      targetType: 'user',
      targetId: userId,
      metadata: {
        role: body.role,
      },
    });
    return result;
  }
}
