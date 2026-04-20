import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Group, GroupDocument, GroupStatus } from './group.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { Submission } from '../submissions/schemas/submission.schema';
import { User, UserDocument } from '../users/data/user.schema';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
    @InjectModel(Submission.name) private submissionModel: Model<Submission>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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

  async addMember(groupId: string, memberUserId: string) {
    const group = await this.findGroupById(groupId);
    if (!group) {
      throw new NotFoundException(`Group not found for groupId: ${groupId}`);
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        memberUserId,
        { teamId: groupId },
        { new: true, select: '-passwordHash' },
      )
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User not found for id: ${memberUserId}`);
    }

    return {
      groupId,
      memberUserId,
      user: updatedUser,
    };
  }

  async validateStatementOfWork(groupId: string) {
    const submissions = await this.submissionModel.find({ 
      groupId: groupId,
      type: { $in: ['SOW', 'RevisedProposal'] }
    });

    if (!submissions || submissions.length === 0) {
      throw new NotFoundException(`No submission records found for group ID: ${groupId}`);
    }

    const sow = submissions.find(sub => sub.type === 'SOW');
    const revisedProposal = submissions.find(sub => sub.type === 'RevisedProposal');

    const sowStatus = sow ? sow.status : 'Not Submitted';
    const revisedStatus = revisedProposal ? revisedProposal.status : 'Not Required';

    let validationState = 'Pending';

    if (sowStatus === 'Approved' && (revisedStatus === 'Approved' || revisedStatus === 'Not Required')) {
      validationState = 'Approved';
    } else if (sowStatus === 'Needs Revision' || revisedStatus === 'Needs Revision') {
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
      canClearSowStatus: validationState === 'Approved'
    };
  }
}
