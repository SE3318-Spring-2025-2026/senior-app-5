import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team, TeamDocument } from './schemas/team.schema';

@Injectable()
export class TeamsService {
  private readonly teamModel: Model<TeamDocument>;

  constructor(@InjectModel(Team.name) teamModel: Model<TeamDocument>) {
    this.teamModel = teamModel;
  }

  async createTeam(name: string, leaderId: string) {
    const team = await this.teamModel.create({
      name,
      leaderId,
      members: [leaderId],
      memberCount: 1,
    });
    return team;
  }

  async findById(id: string): Promise<TeamDocument | null> {
    return this.teamModel.findById(id);
  }

  async addMember(teamId: string, userId: string) {
    const team = await this.teamModel.findById(teamId);
    if (!team) {
      throw new HttpException('Team not found', HttpStatus.NOT_FOUND);
    }

    if (team.members.includes(userId)) {
      throw new HttpException(
        'User is already a member of this team',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const updated = await this.teamModel.findByIdAndUpdate(
      teamId,
      {
        $push: { members: userId },
        $inc: { memberCount: 1 },
      },
      { new: true },
    );

    return { success: true, data: updated };
  }
}
