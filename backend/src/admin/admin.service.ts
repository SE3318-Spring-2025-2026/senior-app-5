import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
    const updatedUser = await this.usersService.updateUserTeam(studentId, groupId);
    if (!updatedUser) {
      throw new NotFoundException('Student not found');
    }

    return updatedUser;
  }
}