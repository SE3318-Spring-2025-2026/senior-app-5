import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { TeamsService } from '../teams/teams.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly usersService: UsersService,
    private readonly teamsService: TeamsService,
  ) {}

  async moveStudentToGroup(studentId: string, groupId: string) {
    // Check if student exists
    const student = await this.usersService.findById(studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Check if group (team) exists
    const team = await this.teamsService.findById(groupId);
    if (!team) {
      throw new BadRequestException('Invalid groupId');
    }

    // Update student's teamId
    const updatedUser = await this.usersService.updateUserTeam(
      studentId,
      groupId,
    );
    if (!updatedUser) {
      throw new NotFoundException('Student not found');
    }

    return updatedUser;
  }

  async getActivityLogs() {
    // Mock data for now. In a real implementation, this would fetch from a database or log files
    return [
      {
        timestamp: new Date('2024-04-14T10:00:00Z'),
        user: 'Coordinator1',
        action: 'Moved student to group',
      },
      {
        timestamp: new Date('2024-04-14T09:30:00Z'),
        user: 'Coordinator1',
        action: 'Created new group',
      },
      {
        timestamp: new Date('2024-04-14T08:45:00Z'),
        user: 'Admin',
        action: 'Deleted user',
      },
    ];
  }
}
