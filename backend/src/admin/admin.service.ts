import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, ClientSession } from 'mongoose';
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
    if (Number.isNaN(targetDate.getTime())) {
      throw new BadRequestException('Invalid sanitizationRunDateTime');
    }

    const runSanitization = async (session?: ClientSession) => {
      const orphanGroupsQuery = this.groupModel.find({
        createdAt: { $lt: targetDate },
        $or: [
          { advisorUserId: { $exists: false } },
          { advisorUserId: null },
          { advisorUserId: '' },
        ],
      });
      if (session) {
        orphanGroupsQuery.session(session);
      }
      const orphanGroups = await orphanGroupsQuery.exec();

      if (orphanGroups.length === 0) {
        return {
          message: 'No unassigned groups found for the given deadline.',
          deletedGroupsCount: 0,
          unlinkedGroupIds: [],
        };
      }

      const groupIdsToDelete = orphanGroups.map((group) => group.groupId);

      const unlinkUsersQuery = this.userModel.updateMany(
        { teamId: { $in: groupIdsToDelete } },
        { $unset: { teamId: '' } },
      );
      if (session) {
        unlinkUsersQuery.session(session);
      }
      await unlinkUsersQuery.exec();

      const deleteGroupsQuery = this.groupModel.deleteMany({
        groupId: { $in: groupIdsToDelete },
      });
      if (session) {
        deleteGroupsQuery.session(session);
      }
      const deleteResult = await deleteGroupsQuery.exec();

      return {
        message: 'Sanitization executed successfully',
        deletedGroupsCount: deleteResult.deletedCount ?? 0,
        unlinkedGroupIds: groupIdsToDelete,
      };
    };

    let session: ClientSession | null = null;
    try {
      session = await this.connection.startSession();
      session.startTransaction();
      const result = await runSanitization(session);
      await session.commitTransaction();
      return result;
    } catch (error: unknown) {
      const typedError = error as { message?: string; codeName?: string };
      const message = typedError?.message ?? 'Unknown sanitization error';

      if (session?.inTransaction()) {
        await session.abortTransaction();
      }

      // Local/dev standalone MongoDB does not support transactions.
      if (
        typedError?.codeName === 'IllegalOperation' ||
        message.includes('Transaction numbers are only allowed on a replica set member or mongos')
      ) {
        this.logger.warn(
          'Mongo transaction unsupported for sanitization. Falling back to non-transactional execution.',
        );
        return runSanitization();
      }

      this.logger.error(`Sanitization failed: ${message}`);
      throw new InternalServerErrorException(
        'Sanitization aborted due to an internal error.',
      );
    } finally {
      session?.endSession();
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