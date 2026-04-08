import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './data/user.schema';

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

  createUser(params: { email: string; passwordHash: string; role?: string }) {
    return this.userModel.create({
      email: params.email.toLowerCase().trim(),
      passwordHash: params.passwordHash,
      role: params.role || 'Student',
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
