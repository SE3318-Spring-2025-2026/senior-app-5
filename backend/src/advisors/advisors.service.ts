import { InternalServerErrorException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/data/user.schema';
import { ListAdvisorsQueryDto } from './dto/list-advisors-query.dto';

export interface AdvisorListItem {
  advisorId: string;
  name: string;
  email: string;
  role: string;
}

interface AdvisorRecord {
  _id?: { toString(): string } | string;
  id?: string;
  name?: string;
  email: string;
  role: string;
}

@Injectable()
export class AdvisorsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async listAdvisors(query: ListAdvisorsQueryDto): Promise<AdvisorListItem[]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const role = query.role ?? 'PROFESSOR';
    const skip = (page - 1) * limit;

    try {
      const advisors = await this.userModel
        .find({ role })
        .skip(skip)
        .limit(limit)
        .lean<AdvisorRecord[]>()
        .exec();

      return advisors.map((advisor) => ({
        advisorId:
          typeof advisor._id === 'string'
            ? advisor._id
            : (advisor._id?.toString() ?? advisor.id ?? ''),
        name: advisor.name ?? advisor.email,
        email: advisor.email,
        role: advisor.role,
      }));
    } catch {
      throw new InternalServerErrorException('Failed to fetch advisors.');
    }
  }
}
