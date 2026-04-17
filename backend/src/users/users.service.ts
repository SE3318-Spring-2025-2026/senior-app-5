import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ROLES } from '../auth/constants/roles';
import { User, UserDocument } from './data/user.schema';
import { Role } from '../auth/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  createUser(params: { email: string; passwordHash: string; role?: Role }) {
    return this.userModel.create({
      email: params.email.toLowerCase().trim(),
      passwordHash: params.passwordHash,
      role: params.role || ROLES.STUDENT,
    });
  }

  async updateUserTeam(studentId: string, teamId: string) {
    return this.userModel
      .findByIdAndUpdate(studentId, { teamId }, { new: true })
      .exec();
  }

  async linkGithubAccount(userId: string, githubAccountId: string) {
    return this.userModel
      .findByIdAndUpdate(userId, { githubAccountId }, { new: true })
      .exec();
  }
}
