import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../auth/enums/role.enum';
import { User, UserDocument } from './data/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  createUser(params: {
    email: string;
    passwordHash: string;
    role?: string;
  }): Promise<UserDocument> {
    return this.userModel.create({
      email: params.email.toLowerCase().trim(),
      passwordHash: params.passwordHash,
      role: params.role || Role.Student,
    });
  }

  async updateUserTeam(
    studentId: string,
    teamId: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(studentId, { teamId }, { returnDocument: 'after' })
      .exec();
  }

  async linkGithubAccount(
    userId: string,
    githubAccountId: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        { githubAccountId },
        { returnDocument: 'after' },
      )
      .exec();
  }
}
