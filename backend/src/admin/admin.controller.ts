import { Controller, Get, Patch, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MoveStudentDto } from './dto/move-student.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../auth/enums/role.enum';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Move a student into a different group' })
  @Patch('students/:studentId/group')
  @Roles(Role.Coordinator, Role.Admin)
  async moveStudentToGroup(
    @Param('studentId') studentId: string,
    @Body() body: MoveStudentDto,
  ) {
    return this.adminService.moveStudentToGroup(studentId, body.groupId);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get recent activity logs' })
  @Get('activity')
  @Roles(Role.Coordinator)
  async getActivityLogs() {
    return this.adminService.getActivityLogs();
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all groups and their advisor assignment status' })
  @Get('advisor-validation')
  @Roles(Role.Coordinator, Role.Admin)
  async getAdvisorValidation() {
    return this.adminService.getAdvisorValidation();
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remove groups without advisors post-deadline' })
  @Post('sanitization/execute')
  @Roles(Role.Coordinator, Role.Admin)
  async executeSanitization(@Body('sanitizationRunDateTime') deadline: string) {
    
    return this.adminService.executeSanitization(deadline);
  }
}
