import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './data/user.schema';
import { Role } from '../auth/enums/role.enum';

const USER_SEARCHABLE_FIELDS = ['email', 'role', '_id'] as const;
export type UserSearchField = (typeof USER_SEARCHABLE_FIELDS)[number];

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

  async searchUsers(field: string, value: string, limit = 10) {
    if (!USER_SEARCHABLE_FIELDS.includes(field as UserSearchField)) {
      throw new BadRequestException(
        `Field "${field}" is not searchable. Allowed: ${USER_SEARCHABLE_FIELDS.join(', ')}`,
      );
    }

    const trimmed = (value ?? '').trim();
    if (!trimmed) return [];

    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);

    let query: Record<string, unknown>;
    if (field === 'email') {
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query = { email: { $regex: escaped, $options: 'i' } };
    } else if (field === '_id') {
      if (!Types.ObjectId.isValid(trimmed)) return [];
      query = { _id: new Types.ObjectId(trimmed) };
    } else {
      query = { [field]: trimmed };
    }

    return this.userModel
      .find(query)
      .select('-passwordHash')
      .limit(safeLimit)
      .exec();
  }

  createUser(params: { email: string; passwordHash: string; role?: Role }) {
    return this.userModel.create({
      email: params.email.toLowerCase().trim(),
      passwordHash: params.passwordHash,
      role: params.role || Role.Student,
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
