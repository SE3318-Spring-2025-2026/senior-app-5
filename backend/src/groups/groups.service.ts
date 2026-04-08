import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Group, GroupDocument, GroupStatus } from './group.entity';
import { CreateGroupDto } from './dto/create-group.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
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
}
