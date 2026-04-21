import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { MoveStudentDto } from './dto/move-student.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Patch('students/:studentId/group')
  @Roles(Role.Coordinator, Role.Admin)
  @ApiOperation({ summary: 'Move a student to a different group' })
  async moveStudentToGroup(
    @Param('studentId') studentId: string,
    @Body() body: MoveStudentDto,
  ) {
    return this.adminService.moveStudentToGroup(studentId, body.groupId);
  }

  @Get('activity')
  @Roles(Role.Coordinator, Role.Admin)
  @ApiOperation({ summary: 'Get recent activity logs' })
  async getActivityLogs() {
    return this.adminService.getActivityLogs();
  }
}