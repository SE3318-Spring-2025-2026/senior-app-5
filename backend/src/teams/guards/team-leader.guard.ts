import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team, TeamDocument } from '../schemas/team.schema';

@Injectable()
export class TeamLeaderGuard implements CanActivate {
  constructor(@InjectModel(Team.name) private teamModel: Model<TeamDocument>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const teamId = request.params.teamId;

    if (!user) {
      throw new ForbiddenException(
        'You must be logged in to perform this action.',
      );
    }

    // Accept either Mongo _id or groupId UUID in the URL.
    let team = null as any;
    if (/^[0-9a-fA-F]{24}$/.test(teamId)) {
      team = await this.teamModel.findById(teamId);
    }
    if (!team) {
      team = await this.teamModel.findOne({ groupId: teamId });
    }
    if (!team) {
      throw new NotFoundException('Team not found.');
    }

    const callerId =
      user.userId ?? user.id ?? user.sub ?? user._id?.toString() ?? null;

    if (!callerId || team.leaderId !== callerId) {
      throw new ForbiddenException(
        'Only the Team Leader can perform this action.',
      );
    }

    return true;
  }
}
