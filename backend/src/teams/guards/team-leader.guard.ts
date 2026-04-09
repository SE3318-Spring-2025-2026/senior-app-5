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

    const team = await this.teamModel.findById(teamId);
    if (!team) {
      throw new NotFoundException('Team not found.');
    }

    if (team.leaderId !== user.id && team.leaderId !== user._id?.toString()) {
      throw new ForbiddenException(
        'Only the Team Leader can perform this action.',
      );
    }

    return true;
  }
}
