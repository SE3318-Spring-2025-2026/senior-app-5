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
import { SprintStory, SprintStoryDocument, GithubStatus } from './schemas/sprint-story.schema';
import { User, UserDocument } from '../users/data/user.schema';
import {
  SprintConfig,
  SprintConfigDocument,
} from '../story-points/schemas/sprint-config.schema';
import {
  StoryPointRecord,
  StoryPointRecordDocument,
  StoryPointSource,
} from '../story-points/schemas/story-point-record.schema';
import { decryptSecret } from '../common/crypto/secret-cipher';

export interface AdvisorPanelStudent {
  studentId: string;
  completedIssues: {
    issueKey: string;
    summary: string;
    work: number;
    resolution: string | null;
    githubStatus: GithubStatus;
    verifiedAt: Date | null;
    isComplete: boolean;
  }[];
  completedPoints: number;
  targetPoints: number;
  individualRatio: number;
}

export interface AdvisorPanelResult {
  teamId: string;
  syncedAt: Date | null;
  students: AdvisorPanelStudent[];
  totalIssues: number;
  verifiedIssues: number;
}

@Injectable()
export class TeamsSyncService {
  private readonly logger = new Logger(TeamsSyncService.name);

  constructor(
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectModel(SprintStory.name) private sprintStoryModel: Model<SprintStoryDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(SprintConfig.name) private sprintConfigModel: Model<SprintConfigDocument>,
    @InjectModel(StoryPointRecord.name) private storyPointRecordModel: Model<StoryPointRecordDocument>,
    private readonly httpService: HttpService,
  ) {}

  // ─────────────────────────────────────────────────────────
  // PUBLIC: Manual / cron-triggered sync
  // ─────────────────────────────────────────────────────────

  async syncStories(teamId: string) {
    const team = await this.teamModel.findById(teamId).exec();
    if (!team) throw new NotFoundException(`Team ${teamId} not found.`);

    if (!team.jiraDomain || !team.jiraApiToken || !team.jiraProjectKey || !team.jiraEmail) {
      throw new BadRequestException('JIRA credentials are not configured for this team.');
    }

    const syncRunId = randomUUID();
    const syncedAt = new Date();

    try {
      const issues = await this.fetchJiraIssues(team);
      const studentByAccountId = await this.buildAccountIdMap(team);

      let linkedCount = 0;
      for (const issue of issues) {
        if (await this.isLocked(teamId, issue.key)) continue;

        const githubResult = team.githubRepositoryId
          ? await this.verifyGithub(team, issue.key)
          : { githubStatus: GithubStatus.NO_BRANCH, verifiedAt: null, branchFound: false, prFound: false };

        const assigneeAccountId: string | null = issue.fields?.assignee?.accountId ?? null;
        const assigneeStudentId = assigneeAccountId
          ? (studentByAccountId.get(assigneeAccountId) ?? null)
          : null;

        const resolution: string | null = issue.fields?.resolution?.name ?? null;
        const storyPointsField = team.jiraStoryPointsField || 'customfield_10016';
        const work: number =
          issue.fields?.[storyPointsField] ??
          issue.fields?.story_points ??
          issue.fields?.customfield_10016 ??
          0;
        const isComplete =
          resolution === 'Done' && githubResult.githubStatus === GithubStatus.VERIFIED;

        if (githubResult.branchFound || githubResult.prFound) linkedCount++;

        const jiraSprintId = this.extractJiraSprintId(issue);

        await this.sprintStoryModel.findOneAndUpdate(
          { teamId, issueKey: issue.key },
          {
            $set: {
              summary: issue.fields?.summary ?? 'No Summary',
              status: issue.fields?.status?.name ?? 'Unknown',
              resolution,
              work,
              assignee: assigneeAccountId,
              assigneeStudentId,
              reporter: issue.fields?.reporter?.accountId ?? null,
              description: this.extractDescription(issue),
              jiraSprintId,
              githubStatus: githubResult.githubStatus,
              verifiedAt: githubResult.verifiedAt,
              githubBranchFound: githubResult.branchFound,
              githubPrFound: githubResult.prFound,
              isComplete,
              syncRunId,
              syncedAt,
            },
          },
          { upsert: true, new: true },
        ).exec();
      }

      this.logger.log(`Sync done for team ${teamId}. RunID: ${syncRunId}`);
      return { syncRunId, totalIssues: issues.length, linkedCount, syncedAt: syncedAt.toISOString() };

    } catch (error) {
      if (
        error instanceof UnprocessableEntityException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) throw error;
      this.logger.error(`Sync error for team ${teamId}`, error);
      throw new InternalServerErrorException('An error occurred while syncing stories.');
    }
  }

  // ─────────────────────────────────────────────────────────
  // PUBLIC: Sprint finalization
  // ─────────────────────────────────────────────────────────

  async finalizeSprintSync(teamId: string, sprintId: string, groupId: string): Promise<{
    lockedCount: number;
    studentRecords: { studentId: string; completedPoints: number; targetPoints: number }[];
  }> {
    const team = await this.teamModel.findById(teamId).exec();
    if (!team) throw new NotFoundException(`Team ${teamId} not found.`);

    const sprintConfig = await this.sprintConfigModel.findOne({ groupId, sprintId }).exec();
    if (!sprintConfig) {
      throw new BadRequestException(`SprintConfig not found for groupId=${groupId} sprintId=${sprintId}`);
    }

    // Final sync before locking. If the sprint is already marked finalized
    // (e.g. another team in the same group already triggered it, or the
    // overdue cron flipped the flag), the sync is still a no-op for locked
    // stories and the recompute below remains safe and idempotent for this
    // team's students.
    await this.syncStories(teamId);

    // Lock all stories for this team
    const lockResult = await this.sprintStoryModel.updateMany(
      { teamId, isLocked: false },
      { $set: { isLocked: true } },
    ).exec();

    // Compute per-student completed points from complete issues
    const completedStories = await this.sprintStoryModel
      .find({ teamId, isComplete: true, assigneeStudentId: { $ne: null } })
      .lean()
      .exec();

    const studentPoints = new Map<string, number>();
    for (const story of completedStories) {
      if (!story.assigneeStudentId) continue;
      const prev = studentPoints.get(story.assigneeStudentId) ?? 0;
      studentPoints.set(story.assigneeStudentId, prev + (story.work ?? 0));
    }

    const targetPoints = sprintConfig.targetStoryPoints;
    const studentRecords: { studentId: string; completedPoints: number; targetPoints: number }[] = [];

    for (const [studentId, completedPoints] of studentPoints) {
      await this.storyPointRecordModel.findOneAndUpdate(
        { studentId, sprintId },
        {
          studentId,
          groupId,
          sprintId,
          completedPoints,
          targetPoints,
          source: StoryPointSource.JIRA_GITHUB,
        },
        { upsert: true, new: true },
      ).exec();
      studentRecords.push({ studentId, completedPoints, targetPoints });
    }

    sprintConfig.isFinalized = true;
    await sprintConfig.save();

    this.logger.log(
      `Sprint finalized for team ${teamId}, sprintId=${sprintId}. Locked ${lockResult.modifiedCount} stories.`,
    );

    return { lockedCount: lockResult.modifiedCount, studentRecords };
  }

  // ─────────────────────────────────────────────────────────
  // PUBLIC: Latest sync records
  // ─────────────────────────────────────────────────────────

  async getLatestSync(teamId: string) {
    const team = await this.teamModel.findById(teamId).exec();
    if (!team) throw new NotFoundException(`Team ${teamId} not found.`);

    return this.sprintStoryModel
      .find({ teamId })
      .select('issueKey summary status resolution work assignee assigneeStudentId githubStatus verifiedAt isComplete isLocked syncedAt -_id')
      .sort({ issueKey: 1 })
      .lean()
      .exec();
  }

  // ─────────────────────────────────────────────────────────
  // PUBLIC: Advisor panel aggregation
  // ─────────────────────────────────────────────────────────

  async getAdvisorPanel(teamId: string, groupId?: string): Promise<AdvisorPanelResult> {
    const team = await this.teamModel.findById(teamId).exec();
    if (!team) throw new NotFoundException(`Team ${teamId} not found.`);

    const stories = await this.sprintStoryModel
      .find({ teamId })
      .lean()
      .exec();

    // Group stories by assigneeStudentId
    const byStudent = new Map<string, typeof stories>();
    for (const story of stories) {
      const sid = story.assigneeStudentId ?? '__unassigned__';
      const list = byStudent.get(sid) ?? [];
      list.push(story);
      byStudent.set(sid, list);
    }

    let targetPoints = 0;
    if (groupId) {
      const latestConfig = await this.sprintConfigModel
        .findOne({ groupId })
        .sort({ startDate: -1 })
        .lean()
        .exec();
      if (latestConfig) targetPoints = latestConfig.targetStoryPoints;
    }

    const students: AdvisorPanelStudent[] = [];
    for (const [studentId, studentStories] of byStudent) {
      if (studentId === '__unassigned__') continue;

      const completedPoints = studentStories
        .filter((s) => s.isComplete)
        .reduce((sum, s) => sum + (s.work ?? 0), 0);

      const individualRatio = targetPoints > 0
        ? Math.min(1, completedPoints / targetPoints)
        : 0;

      students.push({
        studentId,
        completedIssues: studentStories.map((s) => ({
          issueKey: s.issueKey,
          summary: s.summary,
          work: s.work ?? 0,
          resolution: s.resolution ?? null,
          githubStatus: s.githubStatus as GithubStatus,
          verifiedAt: s.verifiedAt ?? null,
          isComplete: s.isComplete ?? false,
        })),
        completedPoints,
        targetPoints,
        individualRatio,
      });
    }

    const latestSyncedAt = stories.length > 0
      ? stories.reduce((latest, s) => {
          const d = s.syncedAt ? new Date(s.syncedAt) : new Date(0);
          return d > latest ? d : latest;
        }, new Date(0))
      : null;

    return {
      teamId,
      syncedAt: latestSyncedAt,
      students,
      totalIssues: stories.length,
      verifiedIssues: stories.filter((s) => s.githubStatus === GithubStatus.VERIFIED).length,
    };
  }

  // ─────────────────────────────────────────────────────────
  // PRIVATE: JIRA fetch
  // ─────────────────────────────────────────────────────────

  private buildAuthHeader(team: TeamDocument): string {
    const token = decryptSecret(team.jiraApiToken);
    return Buffer.from(`${team.jiraEmail}:${token}`).toString('base64');
  }

  private async fetchActiveSprintIdViaBoard(team: TeamDocument, authToken: string): Promise<string | null> {
    if (!team.jiraBoardId) return null;
    try {
      const res: any = await lastValueFrom(
        this.httpService.get(
          `https://${team.jiraDomain}/rest/agile/1.0/board/${team.jiraBoardId}/sprint`,
          {
            params: { state: 'active' },
            headers: {
              Authorization: `Basic ${authToken}`,
              Accept: 'application/json',
            },
          },
        ),
      );
      const sprints: any[] = res.data?.values ?? [];
      if (sprints.length === 0) return null;
      return sprints[0].id?.toString() ?? null;
    } catch (err: any) {
      this.logger.warn(`Board sprint lookup failed for team ${team._id}: ${err.message}. Falling back to JQL.`);
      return null;
    }
  }

  private async fetchIssuesBySprintId(team: TeamDocument, sprintId: string, authToken: string): Promise<any[]> {
    const all: any[] = [];
    let startAt = 0;
    const maxResults = 100;
    const storyPointsField = team.jiraStoryPointsField || 'customfield_10016';
    const fields = [
      'summary',
      'status',
      'assignee',
      'reporter',
      'resolution',
      'description',
      storyPointsField,
      'customfield_10020', // sprint association
    ];

    // Per Jira docs the canonical endpoint scopes the sprint to its board:
    // GET /rest/agile/1.0/board/{boardId}/sprint/{sprintId}/issue
    // We fall back to the sprint-only endpoint for older boards / instances
    // that do not expose the composite path.
    const baseUrl = team.jiraBoardId
      ? `https://${team.jiraDomain}/rest/agile/1.0/board/${team.jiraBoardId}/sprint/${sprintId}/issue`
      : `https://${team.jiraDomain}/rest/agile/1.0/sprint/${sprintId}/issue`;

    while (true) {
      const res: any = await lastValueFrom(
        this.httpService.get(baseUrl, {
          params: {
            startAt,
            maxResults,
            fields: fields.join(','),
          },
          headers: {
            Authorization: `Basic ${authToken}`,
            Accept: 'application/json',
          },
        }),
      );
      const issues: any[] = res.data?.issues ?? [];
      all.push(...issues);
      if (all.length >= (res.data?.total ?? 0) || issues.length < maxResults) break;
      startAt += maxResults;
    }
    return all;
  }

  private async fetchJiraIssues(team: TeamDocument): Promise<any[]> {
    const authToken = this.buildAuthHeader(team);

    const boardSprintId = await this.fetchActiveSprintIdViaBoard(team, authToken);
    if (boardSprintId) {
      try {
        return await this.fetchIssuesBySprintId(team, boardSprintId, authToken);
      } catch (err: any) {
        this.logger.warn(`Sprint issue fetch failed for sprint ${boardSprintId}: ${err.message}. Falling back to JQL.`);
      }
    }

    const jql = `project = "${team.jiraProjectKey}" AND sprint in openSprints() ORDER BY updated DESC`;

    const allIssues: any[] = [];
    let startAt = 0;
    const maxResults = 100;

    while (true) {
      let response: any;
      try {
        response = await lastValueFrom(
          this.httpService.post(
            `https://${team.jiraDomain}/rest/api/3/search/jql`,
            {
              jql,
              maxResults,
              startAt,
              fields: [
                'summary',
                'status',
                'assignee',
                'reporter',
                'resolution',
                'description',
                'story_points',
                'customfield_10016',
                'sprint',
                'customfield_10020',
              ],
            },
            {
              headers: {
                Authorization: `Basic ${authToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
            },
          ),
        );
      } catch (err: any) {
        this.logger.error(`JIRA fetch error: ${err.message}`);
        throw new UnprocessableEntityException(
          'Failed to fetch from JIRA API. Check credentials or project key.',
        );
      }

      const issues: any[] = response.data.issues ?? [];
      allIssues.push(...issues);

      if (allIssues.length >= (response.data.total ?? 0) || issues.length < maxResults) break;
      startAt += maxResults;
    }

    return allIssues;
  }

  // ─────────────────────────────────────────────────────────
  // PRIVATE: GitHub verification
  // ─────────────────────────────────────────────────────────

  private async verifyGithub(
    team: TeamDocument,
    issueKey: string,
  ): Promise<{ githubStatus: GithubStatus; verifiedAt: Date | null; branchFound: boolean; prFound: boolean }> {
    const headers: Record<string, string> = {
      'User-Agent': 'senior-app',
      Accept: 'application/vnd.github+json',
    };
    if (team.githubToken) headers['Authorization'] = `Bearer ${decryptSecret(team.githubToken)}`;

    // Step 1: find branch containing issueKey
    const branchName = await this.findBranchContaining(
      team.githubRepositoryId,
      issueKey,
      headers,
    );

    if (!branchName) {
      return { githubStatus: GithubStatus.NO_BRANCH, verifiedAt: null, branchFound: false, prFound: false };
    }

    // Step 2: find PR for that branch
    const pr = await this.findPullRequest(
      team.githubRepositoryId,
      issueKey,
      branchName,
      headers,
    );

    if (!pr) {
      return { githubStatus: GithubStatus.NO_PR, verifiedAt: null, branchFound: true, prFound: false };
    }

    // Step 3: check merge status
    if (pr.merged_at) {
      return {
        githubStatus: GithubStatus.VERIFIED,
        verifiedAt: new Date(pr.merged_at),
        branchFound: true,
        prFound: true,
      };
    }

    return { githubStatus: GithubStatus.PR_NOT_MERGED, verifiedAt: null, branchFound: true, prFound: true };
  }

  private async findBranchContaining(
    repoId: string,
    issueKey: string,
    headers: Record<string, string>,
  ): Promise<string | null> {
    const issueKeyLower = issueKey.toLowerCase();
    let page = 1;
    while (true) {
      let res: any;
      try {
        res = await lastValueFrom(
          this.httpService.get(
            `https://api.github.com/repos/${repoId}/branches`,
            { headers, params: { per_page: 100, page } },
          ),
        );
      } catch {
        return null;
      }
      const branches: any[] = res.data ?? [];
      if (branches.length === 0) break;

      const match = branches.find((b: any) =>
        b.name.toLowerCase().includes(issueKeyLower),
      );
      if (match) return match.name as string;
      if (branches.length < 100) break;
      page++;
    }
    return null;
  }

  private async findPullRequest(
    repoId: string,
    issueKey: string,
    branchName: string,
    headers: Record<string, string>,
  ): Promise<any | null> {
    const issueKeyLower = issueKey.toLowerCase();
    let page = 1;
    while (true) {
      let res: any;
      try {
        res = await lastValueFrom(
          this.httpService.get(
            `https://api.github.com/repos/${repoId}/pulls`,
            { headers, params: { state: 'all', per_page: 100, page } },
          ),
        );
      } catch {
        return null;
      }
      const prs: any[] = res.data ?? [];
      if (prs.length === 0) break;

      const match = prs.find((pr: any) =>
        pr.head?.ref?.toLowerCase().includes(issueKeyLower) ||
        pr.head?.ref === branchName ||
        pr.title?.toLowerCase().includes(issueKeyLower),
      );
      if (match) return match;
      if (prs.length < 100) break;
      page++;
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────
  // PRIVATE: Helpers
  // ─────────────────────────────────────────────────────────

  private async isLocked(teamId: string, issueKey: string): Promise<boolean> {
    const existing = await this.sprintStoryModel
      .findOne({ teamId, issueKey }, { isLocked: 1 })
      .lean()
      .exec();
    return existing?.isLocked === true;
  }

  private async buildAccountIdMap(team: TeamDocument): Promise<Map<string, string>> {
    const users = await this.userModel
      .find({ teamId: team._id?.toString(), jiraAccountId: { $ne: null } })
      .select('_id jiraAccountId')
      .lean()
      .exec();

    const map = new Map<string, string>();
    for (const u of users) {
      if (u.jiraAccountId) {
        map.set(u.jiraAccountId, (u._id as any).toString());
      }
    }
    return map;
  }

  private extractDescription(issue: any): string | null {
    const desc = issue.fields?.description;
    if (!desc) return null;
    // JIRA Cloud uses Atlassian Document Format (ADF)
    if (typeof desc === 'string') return desc.slice(0, 500);
    if (desc?.content) {
      const text = this.adfToText(desc);
      return text.slice(0, 500) || null;
    }
    return null;
  }

  private adfToText(node: any): string {
    if (!node) return '';
    if (node.type === 'text') return node.text ?? '';
    if (Array.isArray(node.content)) {
      return node.content.map((c: any) => this.adfToText(c)).join(' ');
    }
    return '';
  }

  private extractJiraSprintId(issue: any): string | null {
    // Sprint data lives in customfield_10020 (array of sprint objects) in Cloud
    const sprints: any[] = issue.fields?.customfield_10020 ?? issue.fields?.sprint ?? [];
    if (Array.isArray(sprints) && sprints.length > 0) {
      const active = sprints.find((s: any) => s.state === 'active') ?? sprints[sprints.length - 1];
      return active?.id?.toString() ?? null;
    }
    return null;
  }
}
