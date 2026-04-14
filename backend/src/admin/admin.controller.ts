import { Controller, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MoveStudentDto } from './dto/move-student.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Patch('students/:studentId/group')
  @Roles('Coordinator', 'Admin')
  async moveStudentToGroup(
    @Param('studentId') studentId: string,
    @Body() body: MoveStudentDto,
  ) {
    return this.adminService.moveStudentToGroup(studentId, body.groupId);
  }
}
