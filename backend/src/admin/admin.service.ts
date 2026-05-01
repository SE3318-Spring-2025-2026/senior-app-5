import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { UsersService } from '../users/users.service';
import { Group, GroupDocument } from '../groups/group.entity';
import { User, UserDocument } from '../users/data/user.schema';
import { Role } from '../auth/enums/role.enum';
import { GroupAssignmentStatus, GroupStatus } from '../groups/group.entity';
import {
  AdvisorRequest,
  AdvisorRequestDocument,
  AdvisorRequestStatus,
} from '../advisors/schemas/advisor-request.schema';
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly usersService: UsersService,
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(AdvisorRequest.name) private advisorRequestModel: Model<AdvisorRequestDocument>,
    @InjectConnection() private readonly connection: Connection, 
  ) {}

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

  async getDashboardMetrics() {
    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
    const [
      totalStudents,
      activeGroups,
      pendingAdvisorRequests,
      unassignedGroups,
      activityCountLast24h,
    ] = await Promise.all([
      this.userModel.countDocuments({ role: Role.Student }),
      this.groupModel.countDocuments({ status: GroupStatus.ACTIVE }),
      this.advisorRequestModel.countDocuments({ status: AdvisorRequestStatus.PENDING }),
      this.groupModel.countDocuments({
        $or: [
          { assignmentStatus: GroupAssignmentStatus.UNASSIGNED },
          { advisorUserId: { $exists: false } },
          { advisorUserId: null },
          { advisorUserId: '' },
        ],
      }),
      this.advisorRequestModel.countDocuments({ createdAt: { $gte: since24h } }),
    ]);
  
    let platformHealth: 'healthy' | 'degraded' = 'healthy';
    try {
      if (!this.connection.db) {
        platformHealth = 'degraded';
      } else {
        await this.connection.db.admin().ping();
      }
    } catch {
      platformHealth = 'degraded';
    }
  
    return {
      totalStudents,
      activeGroups,
      pendingAdvisorRequests,
      unassignedGroups,
      activityCountLast24h,
      platformHealth,
      generatedAt: now.toISOString(),
    };
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

  async getActivityLogs() {
    return [
      { timestamp: new Date(), user: 'System', action: 'Admin service active' }
    ];
  }
}