import { Controller, Get, Patch, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { MoveStudentDto } from './dto/move-student.dto';
import { SanitizeGroupsDto } from './dto/sanitize-groups.dto';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardMetricsDto } from './dto/dashboard-metrics.dto';

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

  @Get('advisor-validation')
  @Roles(Role.Coordinator, Role.Admin)
  @ApiOperation({ summary: 'Check group-advisor assignment health' })
  async getAdvisorValidation() {
    return this.adminService.getAdvisorValidation();
  }

  
  @Post('sanitization/execute')
  @Roles(Role.Coordinator, Role.Admin)
  @ApiOperation({ summary: 'Clean up groups without advisors (Destructive)' })
  async executeSanitization(@Body() body: SanitizeGroupsDto) {
    return this.adminService.executeSanitization(body.sanitizationRunDateTime);
  }

  @Get('activity')
  @Roles(Role.Coordinator, Role.Admin)
  async getActivityLogs() {
    return this.adminService.getActivityLogs();
  }

  @Get('dashboard-metrics')
  @Roles(Role.Coordinator, Role.Admin)
  @ApiOperation({ summary: 'Get dashboard metrics' })
  @ApiOkResponse({ type: DashboardMetricsDto })
  async getDashboardMetrics() {
    return this.adminService.getDashboardMetrics();
  }
}