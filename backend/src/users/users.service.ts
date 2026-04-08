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

  // params içine 'role' ekledik
  createUser(params: { email: string; passwordHash: string; role: string }) {
    return this.userModel.create({
      email: params.email.toLowerCase().trim(),
      passwordHash: params.passwordHash,
      role: params.role, 
    });
  }

  async linkGithubAccount(userId: string, githubAccountId: string) {
    return this.userModel.findByIdAndUpdate(
      userId,
      { githubAccountId },
      { new: true }
    ).exec();
  }
}
