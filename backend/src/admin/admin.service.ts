import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { Group, GroupDocument } from '../groups/group.entity';
import { User, UserDocument } from '../users/data/user.schema';
import { Role } from '../auth/enums/role.enum';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ListActivityLogsQueryDto } from '../activity-logs/dto/list-activity-logs-query.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async updateUserRole(userId: string, role: Role) {
    const updated = await this.usersService.updateRole(userId, role);
    if (!updated) throw new NotFoundException('User not found');
    return { id: updated._id.toString(), email: updated.email, role: updated.role };
  }

  async moveStudentToGroup(studentId: string, groupId: string) {
    
    const student = await this.usersService.findById(studentId);
    if (!student) throw new NotFoundException('Student not found');

    const group = await this.groupModel.findOne({ groupId }).exec();
    if (!group) throw new BadRequestException('Invalid groupId');

    const updatedUser = await this.usersService.updateUserTeam(studentId, groupId);
    if (!updatedUser) throw new NotFoundException('User update failed');

    return updatedUser;
  }

  async getAdvisorValidation() {
    const groups = await this.groupModel.find({}, 'groupId groupName advisorUserId status').exec();
    return groups.map(group => ({
      groupId: group.groupId,
      groupName: group.groupName,
      advisorUserId: group.advisorUserId || null,
      status: group.status,
    }));
  }

  
  async executeSanitization(deadline: string) {
    const targetDate = new Date(deadline);
    const session = await this.connection.startSession(); 

    session.startTransaction();
    try {
      
      const orphanGroups = await this.groupModel.find({
        createdAt: { $lt: targetDate },
        $or: [
          { advisorUserId: { $exists: false } },
          { advisorUserId: null },
          { advisorUserId: '' }
        ]
      }).session(session).exec();

      if (orphanGroups.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return { message: 'No unassigned groups found for the given deadline.', deletedCount: 0 };
      }

      const groupIdsToDelete = orphanGroups.map(g => g.groupId);

      
      await this.userModel.updateMany(
        { teamId: { $in: groupIdsToDelete } },
        { $unset: { teamId: '' } }
      ).session(session).exec();

      
      const deleteResult = await this.groupModel.deleteMany({
        groupId: { $in: groupIdsToDelete }
      }).session(session).exec();

      
      await session.commitTransaction();
      session.endSession();

      return {
        message: 'Sanitization executed successfully',
        deletedGroupsCount: deleteResult.deletedCount,
        unlinkedGroupIds: groupIdsToDelete,
      };
    } catch (error) {
      
      await session.abortTransaction();
      session.endSession();
      this.logger.error(`Sanitization failed: ${error.message}`);
      throw new Error('Sanitization aborted due to an internal error.');
    }
  }

  async getActivityLogs(query: ListActivityLogsQueryDto) {
    return this.activityLogsService.findPaginated(query);
  }

  async sendPasswordResetForUser(userId: string): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const token = await this.usersService.createPasswordResetToken(user.email);
    if (!token) {
      throw new BadRequestException('Could not generate reset token for this user');
    }

    await this.mailService.sendPasswordReset(user.email, token);
    this.logger.log(`Admin triggered password reset for user ${userId} (${user.email})`);

    return { message: `Password reset link sent to ${user.email}` };
  }
}