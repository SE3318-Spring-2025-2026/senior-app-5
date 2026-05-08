import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { randomUUID } from 'crypto';
import { Team, TeamDocument } from './schemas/team.schema';
import { SprintStory, SprintStoryDocument } from './schemas/sprint-story.schema';

@Injectable()
export class TeamsSyncService {
  private readonly logger = new Logger(TeamsSyncService.name);

  constructor(
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectModel(SprintStory.name) private sprintStoryModel: Model<SprintStoryDocument>,
    private readonly httpService: HttpService,
  ) {}

  async syncStories(teamId: string) {
    const team = await this.teamModel.findById(teamId).exec();
    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found.`);
    }

    if (!team.jiraDomain || !team.jiraApiToken || !team.jiraProjectKey || !team.jiraEmail) {
      throw new BadRequestException('JIRA credentials or project key are not configured for this team.');
    }

    const syncRunId = randomUUID();
    const syncedAt = new Date();
    let totalIssues = 0;
    let linkedCount = 0;

    try {
      const authToken = Buffer.from(`${team.jiraEmail}:${team.jiraApiToken}`).toString('base64');
      const jiraUrl = `https://${team.jiraDomain}/rest/api/3/search?jql=project=${team.jiraProjectKey}`;
      
      const jiraResponse = await lastValueFrom(
        this.httpService.get(jiraUrl, {
          headers: {
            Authorization: `Basic ${authToken}`,
            Accept: 'application/json',
          },
        })
      ).catch((error) => {
        this.logger.error(`JIRA API Error: ${error.message}`);
        throw new UnprocessableEntityException('Failed to fetch from JIRA API. Check credentials or project key.');
      });

      const issues = jiraResponse.data.issues || [];
      totalIssues = issues.length;

      for (const issue of issues) {
        const issueKey = issue.key;
        const summary = issue.fields?.summary || 'No Summary';
        const status = issue.fields?.status?.name || 'Unknown';

        let githubBranchFound = false;
        let githubPrFound = false;

        if (team.githubRepositoryId) {
          // 1. Check GitHub Branch
          try {
            await lastValueFrom(
              this.httpService.get(
                `https://api.github.com/repos/${team.githubRepositoryId}/branches/${issueKey}`
              )
            );
            githubBranchFound = true;
           } catch (e) {

          }

          // 2. Check GitHub PR
          try {
            const prsRes = await lastValueFrom(
              this.httpService.get(
                `https://api.github.com/repos/${team.githubRepositoryId}/pulls?head=${issueKey}`
              )
            );
            if (Array.isArray(prsRes.data) && prsRes.data.length > 0) {
              githubPrFound = true;
            }
          } catch (e) {
        
          }
        }

        if (githubBranchFound || githubPrFound) {
          linkedCount++;
        }

        
        await this.sprintStoryModel.findOneAndUpdate(
          { teamId, issueKey },
          {
            $set: {
              summary,
              status,
              githubBranchFound,
              githubPrFound,
              syncRunId,
              syncedAt,
            },
          },
          { upsert: true, new: true },
        ).exec();
      }

      this.logger.log(`Sync completed for team ${teamId}. RunID: ${syncRunId}`);

      return {
        syncRunId,
        totalIssues,
        linkedCount,
        syncedAt: syncedAt.toISOString(),
      };

    } catch (error) {
      if (error instanceof UnprocessableEntityException) {
        throw error;
      }
      this.logger.error(`Unexpected sync error for team ${teamId}`, error);
      throw new InternalServerErrorException('An error occurred while syncing stories.');
    }
  }

  async getLatestSync(teamId: string) {
    const team = await this.teamModel.findById(teamId).exec();
    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found.`);
    }

    return this.sprintStoryModel
      .find({ teamId })
      .select('issueKey summary status githubBranchFound githubPrFound syncedAt -_id')
      .sort({ issueKey: 1 })
      .lean()
      .exec();
  }
}