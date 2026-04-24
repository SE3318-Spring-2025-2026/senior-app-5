import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { User, UserDocument } from './data/user.schema';
import { Role } from '../auth/enums/role.enum';
import { User, UserDocument } from './data/user.schema';

const USER_SEARCHABLE_FIELDS = ['email', 'role', '_id'] as const;
export type UserSearchField = (typeof USER_SEARCHABLE_FIELDS)[number];

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

  async createPasswordResetToken(email: string) {
    const normalizedEmail = email?.toLowerCase().trim();
    if (!normalizedEmail) return null;

    const user = await this.findByEmail(normalizedEmail);
    if (!user) return null;

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashPasswordResetToken(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await this.userModel
      .findByIdAndUpdate(
        user._id,
        {
          passwordResetTokenHash: tokenHash,
          passwordResetTokenExpiresAt: expiresAt,
        },
        { new: true },
      )
      .exec();

    return token;
  }

  findByPasswordResetToken(token: string) {
    if (!token?.trim()) return null;

    const tokenHash = this.hashPasswordResetToken(token);
    return this.userModel
      .findOne({
        passwordResetTokenHash: tokenHash,
        passwordResetTokenExpiresAt: { $gt: new Date() },
      })
      .exec();
  }

  async updatePasswordHash(userId: string, passwordHash: string) {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: { passwordHash },
          $unset: { passwordResetTokenHash: "", passwordResetTokenExpiresAt: "" }
        },
        { new: true },
      )
      .exec();
  }
  private hashPasswordResetToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async updateUserTeam(studentId: string, teamId: string) {
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
