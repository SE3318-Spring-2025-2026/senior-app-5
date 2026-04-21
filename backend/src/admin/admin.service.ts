import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { Group, GroupDocument } from '../groups/group.entity';
import { User, UserDocument } from '../users/data/user.schema';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly usersService: UsersService,
    
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  
  async moveStudentToGroup(studentId: string, groupId: string) {
    const student = await this.usersService.findById(studentId);
    if (!student) throw new NotFoundException('Student not found');

    // Mongoose ObjectId yerine groupId (UUID) ile sorgu yapıyoruz
    const group = await this.groupModel.findOne({ groupId: groupId }).exec();
    
    if (!group) {
      this.logger.error(`Validation failed: Group with UUID ${groupId} does not exist.`);
      throw new BadRequestException('Invalid groupId: No matching Group UUID found');
    }

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

  
  async executeSanitization() {
    const orphanGroups = await this.groupModel.find({ 
      $or: [
        { advisorUserId: { $exists: false } },
        { advisorUserId: null },
        { advisorUserId: "" }
      ] 
    }).exec();

    if (orphanGroups.length === 0) return { message: 'No unassigned groups found.', deletedCount: 0 };

    const groupIdsToDelete = orphanGroups.map(g => g.groupId);

    
    await this.userModel.updateMany(
      { teamId: { $in: groupIdsToDelete } },
      { $unset: { teamId: "" } } 
    ).exec();

    
    const deleteResult = await this.groupModel.deleteMany({
      groupId: { $in: groupIdsToDelete }
    }).exec();

    return {
      message: 'Sanitization executed successfully',
      deletedGroupsCount: deleteResult.deletedCount,
      unlinkedGroupIds: groupIdsToDelete,
    };
  }

  async getActivityLogs() {
    return [
      { timestamp: new Date('2024-04-14T10:00:00Z'), user: 'Coordinator1', action: 'Moved student to group' },
      { timestamp: new Date('2024-04-14T09:30:00Z'), user: 'Coordinator1', action: 'Created new group' },
      { timestamp: new Date('2024-04-14T08:45:00Z'), user: 'Admin', action: 'Deleted user' },
    ];
  }
}