import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@ApiTags('Admin') 
@ApiBearerAuth() 
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Patch('students/:studentId/group')
  @Roles(Role.Coordinator, Role.Admin)
  @ApiOperation({ summary: 'Move a student into a different group' })
  async moveStudentToGroup(
    @Param('studentId') studentId: string,
    @Body('groupId') groupId: string,
  ) {
    return this.adminService.moveStudentToGroup(studentId, groupId);
  }

  @Get('activity')
  @Roles(Role.Coordinator, Role.Admin)
  @ApiOperation({ summary: 'Get recent activity logs' })
  async getActivityLogs() {
    return this.adminService.getActivityLogs();
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
  async executeSanitization() {
    return this.adminService.executeSanitization();
  }
}