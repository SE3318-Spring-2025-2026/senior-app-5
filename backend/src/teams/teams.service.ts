import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { lastValueFrom } from 'rxjs';
import { Team, TeamDocument } from './schemas/team.schema';
import { UpdateIntegrationsDto } from './dto/update-integrations.dto';
import { encryptSecret } from '../common/crypto/secret-cipher';

@Injectable()
export class TeamsService {
  constructor(
    private readonly httpService: HttpService,
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
  ) {}

  async updateIntegrations(teamId: string, dto: UpdateIntegrationsDto) {
    
    const {
      jiraProjectKey,
      jiraDomain,
      jiraEmail,
      jiraApiToken,
      githubRepositoryId,
      githubToken,
      jiraBoardId,
      groupId,
      jiraStoryPointsField,
    } = dto;

    try {
      const headers: Record<string, string> = { 'User-Agent': 'senior-app' };
      if (githubToken) headers['Authorization'] = `Bearer ${githubToken}`;
      await lastValueFrom(
        this.httpService.get(
          `https://api.github.com/repos/${githubRepositoryId}`,
          { headers, timeout: 5000 }
        ),
      );
    } catch (error: any) {
      throw new HttpException(
        'Invalid or not found GitHub Repository ID.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    try {
      const authToken = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64');
      
      await lastValueFrom(
        this.httpService.get(
          `https://${jiraDomain}/rest/api/3/project/${jiraProjectKey}`,
          {
            headers: {
              Authorization: `Basic ${authToken}`,
              Accept: 'application/json',
            },
            timeout: 5000,
          }
        ),
      );
    } catch (error: any) {
      const status = error.response?.status;
      let errorMessage = 'Invalid Jira Project Key or Domain.';
      
      if (status === 401 || status === 403) {
        errorMessage = 'Jira Authentication failed. Please check your Email and API Token.';
      }

      throw new HttpException(
        errorMessage,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    let updatedTeam: TeamDocument | null;
    try {
      const updateFields: Record<string, unknown> = {
        jiraProjectKey,
        jiraDomain,
        jiraEmail,
        jiraApiToken: encryptSecret(jiraApiToken),
        githubRepositoryId,
      };
      if (githubToken !== undefined) updateFields.githubToken = encryptSecret(githubToken);
      if (jiraBoardId !== undefined) updateFields.jiraBoardId = jiraBoardId || null;
      if (groupId !== undefined) updateFields.groupId = groupId || null;
      if (jiraStoryPointsField) updateFields.jiraStoryPointsField = jiraStoryPointsField;

      updatedTeam = await this.teamModel
        .findByIdAndUpdate(
          teamId,
          updateFields,
          { returnDocument: 'after' },
        )
        .exec();
    } catch (error: any) {
      throw new HttpException(
        'Database error. Team ID might be invalid.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!updatedTeam) {
      throw new HttpException(
        'Team not found in the database.',
        HttpStatus.NOT_FOUND,
      );
    }
    
    
    const teamData = updatedTeam.toObject();
    delete teamData.jiraApiToken;
    delete teamData.githubToken;

    return {
      success: true,
      message: 'Integrations successfully verified and saved to database.',
      data: teamData,
    };
  }

  findById(id: string) {
    return this.teamModel.findById(id).exec();
  }

  /**
   * Returns the Team owned by the given leader user, creating a stub record
   * if none exists. This backfills users who became TeamLeader before the
   * Group→Team mirroring was introduced.
   */
  async findOrCreateMyTeam(
    leaderUserId: string,
    fallback: { name?: string | null; groupId?: string | null } = {},
  ) {
    let team = await this.teamModel.findOne({ leaderId: leaderUserId }).exec();
    if (!team) {
      team = await this.teamModel.create({
        leaderId: leaderUserId,
        name: fallback.name || 'My Team',
        groupId: fallback.groupId || null,
      });
    } else if (fallback.groupId && !team.groupId) {
      team.groupId = fallback.groupId;
      await team.save();
    }

    const obj = team.toObject();
    return {
      teamId: (team._id as any).toString(),
      name: obj.name,
      leaderId: obj.leaderId,
      groupId: obj.groupId ?? null,
      jiraProjectKey: obj.jiraProjectKey ?? null,
      jiraDomain: obj.jiraDomain ?? null,
      jiraBoardId: obj.jiraBoardId ?? null,
      githubRepositoryId: obj.githubRepositoryId ?? null,
      hasJira: !!(obj.jiraDomain && obj.jiraProjectKey),
      hasGithub: !!obj.githubRepositoryId,
    };
  }

  /**
   * Returns a directory of teams suitable for populating UI dropdowns.
   * No secrets (api token, github token) are exposed.
   */
  async listAll() {
    const docs = await this.teamModel
      .find({})
      .select('_id name leaderId groupId jiraProjectKey jiraDomain jiraBoardId jiraStoryPointsField githubRepositoryId')
      .sort({ name: 1 })
      .lean()
      .exec();

    return docs.map((t) => ({
      teamId: (t._id as any).toString(),
      name: t.name,
      leaderId: t.leaderId,
      groupId: t.groupId ?? null,
      jiraProjectKey: t.jiraProjectKey ?? null,
      jiraDomain: t.jiraDomain ?? null,
      jiraBoardId: t.jiraBoardId ?? null,
      jiraStoryPointsField: t.jiraStoryPointsField ?? 'customfield_10016',
      githubRepositoryId: t.githubRepositoryId ?? null,
      hasJira: !!(t.jiraDomain && t.jiraProjectKey),
      hasGithub: !!t.githubRepositoryId,
    }));
  }
}