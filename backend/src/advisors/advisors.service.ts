import { InternalServerErrorException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { getAdvisorRoleFilters, ROLES } from '../auth/constants/roles';
import { User, UserDocument } from '../users/data/user.schema';
import { ListAdvisorsQueryDto } from './dto/list-advisors-query.dto';

export interface AdvisorListItem {
  advisorId: string;
  name: string;
  email: string;
  role: string;
}

export interface PaginatedAdvisorsResponse {
  data: AdvisorListItem[];
  total: number;
  page: number;
  limit: number;
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

  async listAdvisors(
    query: ListAdvisorsQueryDto,
  ): Promise<PaginatedAdvisorsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const advisorRoleFilters = getAdvisorRoleFilters();
    const roleFilter = { role: { $in: advisorRoleFilters } };
    const skip = (page - 1) * limit;

    try {
      const total = await this.userModel.countDocuments(roleFilter).exec();
      const advisors = await this.userModel
        .find(roleFilter)
        .skip(skip)
        .limit(limit)
        .lean<AdvisorRecord[]>()
        .exec();

      const data = advisors.map((advisor) => ({
        advisorId:
          typeof advisor._id === 'string'
            ? advisor._id
            : (advisor._id?.toString() ?? advisor.id ?? ''),
        name: advisor.name ?? advisor.email,
        email: advisor.email,
        role: ROLES.ADVISOR,
      }));

      return { data, total, page, limit };
    } catch {
      throw new InternalServerErrorException('Failed to fetch advisors.');
    }
  }
}
