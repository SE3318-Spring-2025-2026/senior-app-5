import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Group, GroupDocument, GroupStatus } from './group.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupAssignmentStatus } from './dto/group-assignment-status.dto';
import { Submission } from '../submissions/schemas/submission.schema';
import { NotificationService } from '../notifications/notification.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
    @InjectModel(Submission.name) private submissionModel: Model<Submission>,
    private readonly notificationService: NotificationService,
    private readonly usersService: UsersService,
  ) {}

  async createGroup(createGroupDto: CreateGroupDto): Promise<Group> {
    const group = new this.groupModel({
      ...createGroupDto,
      status: GroupStatus.ACTIVE,
    });

    return group.save();
  }

  async findGroupById(groupId: string): Promise<Group | null> {
    return this.groupModel.findOne({ groupId }).exec();
  }

  async validateStatementOfWork(groupId: string) {
    const submissions = await this.submissionModel.find({
      groupId: groupId,
      type: { $in: ['SOW', 'RevisedProposal'] },
    });

    if (!submissions || submissions.length === 0) {
      throw new NotFoundException(
        `No submission records found for group ID: ${groupId}`,
      );
    }

    const sow = submissions.find((sub) => sub.type === 'SOW');
    const revisedProposal = submissions.find(
      (sub) => sub.type === 'RevisedProposal',
    );

    const sowStatus = sow ? sow.status : 'Not Submitted';
    const revisedStatus = revisedProposal
      ? revisedProposal.status
      : 'Not Required';

    let validationState = 'Pending';

    if (
      sowStatus === 'Approved' &&
      (revisedStatus === 'Approved' || revisedStatus === 'Not Required')
    ) {
      validationState = 'Approved';
    } else if (
      sowStatus === 'Needs Revision' ||
      revisedStatus === 'Needs Revision'
    ) {
      validationState = 'Needs Revision';
    } else if (sowStatus === 'Submitted' || revisedStatus === 'Submitted') {
      validationState = 'Submitted';
    }

    return {
      groupId,
      documents: {
        statementOfWork: sowStatus,
        revisedProposal: revisedStatus,
      },
      overallValidationStatus: validationState,
      canClearSowStatus: validationState === 'Approved',
    };
  }

  /**
   * Transfer a group from one advisor to another
   * @param groupId - The group ID to transfer
   * @param currentAdvisorId - The current advisor ID (must match existing)
   * @param newAdvisorId - The new advisor ID to assign
   * @param coordinatorId - The coordinator performing the transfer
   * @returns GroupAssignmentStatus with new advisor information
   * @throws NotFoundException if group, current advisor, or new advisor not found
   * @throws BadRequestException if newAdvisorId equals currentAdvisorId
   */
  async transferAdvisor(
    groupId: string,
    currentAdvisorId: string,
    newAdvisorId: string,
    coordinatorId: string,
  ): Promise<GroupAssignmentStatus> {
    // Validate that new advisor is different from current advisor
    if (newAdvisorId === currentAdvisorId) {
      throw new BadRequestException(
        'New advisor must be different from current advisor',
      );
    }

    // Find the group
    const group = await this.findGroupById(groupId);
    if (!group) {
      throw new NotFoundException(`Group ${groupId} not found`);
    }

    // Validate that currentAdvisorId matches the existing advisor
    if (group.advisorId !== currentAdvisorId) {
      throw new NotFoundException(
        `Current advisor ${currentAdvisorId} is not assigned to group ${groupId}`,
      );
    }

    // Validate that new advisor exists
    const newAdvisor = await this.usersService.findById(newAdvisorId);
    if (!newAdvisor) {
      throw new NotFoundException(`Advisor ${newAdvisorId} not found`);
    }

    // Update group with new advisor
    const updatedGroup = await this.groupModel
      .findOneAndUpdate(
        { groupId },
        { advisorId: newAdvisorId, advisorName: newAdvisor.email },
        { new: true },
      )
      .exec();

    if (!updatedGroup) {
      throw new NotFoundException(`Failed to update group ${groupId}`);
    }

    // Send notifications
    await this.notificationService.sendAdvisorRemovalNotification(
      currentAdvisorId,
      groupId,
      group.groupName,
    );

    await this.notificationService.sendAdvisorAssignmentNotification(
      newAdvisorId,
      groupId,
      group.groupName,
    );

    // Log transfer event
    console.log('EVENT: advisor_transferred', {
      groupId,
      oldAdvisorId: currentAdvisorId,
      newAdvisorId,
      coordinatorId,
      timestamp: new Date().toISOString(),
    });

    // Return GroupAssignmentStatus
    return {
      groupId,
      status: 'ASSIGNED',
      advisorId: newAdvisorId,
      advisorName: newAdvisor.email,
      canSubmitRequest: true,
      blockedReason: null,
      updatedAt: new Date(),
    };
  }
}
