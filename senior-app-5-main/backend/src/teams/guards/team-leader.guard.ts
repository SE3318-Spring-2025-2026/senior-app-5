import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team, TeamDocument } from '../schemas/team.schema';

@Injectable()
export class TeamLeaderGuard implements CanActivate {
  constructor(@InjectModel(Team.name) private readonly teamModel: Model<TeamDocument>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Must be logged in');
    }

    const teamId = request.params.teamId;
    if (!teamId) {
      throw new ForbiddenException('Team ID is required');
    }

    const team = await this.teamModel.findById(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.leaderId !== user.userId) {
      throw new ForbiddenException('Only team leader can perform this action');
    }

    return true;
  }
}
