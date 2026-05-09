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
  SprintConfigEntry,
  SprintConfigDocument as SprintConfigEntryDocument,
} from '../sprint-configs/schemas/sprint-config.schema';
import {
  StoryPointRecord,
  StoryPointRecordDocument,
  StoryPointSource,
} from '../story-points/schemas/story-point-record.schema';
import {
  GroupFinalGrade,
  GroupFinalGradeDocument,
  StudentFinalGrade,
  StudentFinalGradeDocument,
} from '../grades/schemas/grade-records.schema';
import { decryptSecret } from '../common/crypto/secret-cipher';
import { GeminiService } from '../ai/gemini.service';

export interface AdvisorPanelStudent {
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  finalGrade: number | null;
  individualAllowanceRatio: number | null;
  completedIssues: {
    issueKey: string;
    summary: string;
    work: number;
    resolution: string | null;
    githubStatus: GithubStatus;
    verifiedAt: Date | null;
    isComplete: boolean;
    reviewQuality: {
      hasMeaningfulReview: boolean;
      score: number;
      reasoning: string;
    } | null;
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
  teamGrade: number | null;
  teamGradeCalculatedAt: Date | null;
}

@Injectable()
export class TeamsSyncService {
  private readonly logger = new Logger(TeamsSyncService.name);

  constructor(
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectModel(SprintStory.name) private sprintStoryModel: Model<SprintStoryDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(SprintConfigEntry.name) private sprintConfigModel: Model<SprintConfigEntryDocument>,
    @InjectModel(StoryPointRecord.name) private storyPointRecordModel: Model<StoryPointRecordDocument>,
    @InjectModel(GroupFinalGrade.name) private groupFinalGradeModel: Model<GroupFinalGradeDocument>,
    @InjectModel(StudentFinalGrade.name) private studentFinalGradeModel: Model<StudentFinalGradeDocument>,
    private readonly httpService: HttpService,
    private readonly geminiService: GeminiService,
  ) {}

  /**
   * Accepts either a Mongo ObjectId string or a groupId UUID and returns the
   * matching Team. Sync URLs use groupId UUIDs while the cron passes the
   * Team document's own _id — both must work.
   */
  private async resolveTeam(idOrGroupId: string): Promise<TeamDocument | null> {
    if (!idOrGroupId) return null;
    if (/^[0-9a-fA-F]{24}$/.test(idOrGroupId)) {
      const byId = await this.teamModel.findById(idOrGroupId).exec();
      if (byId) return byId;
    }
    return this.teamModel.findOne({ groupId: idOrGroupId }).exec();
  }

  // ─────────────────────────────────────────────────────────
  // PUBLIC: Integration health / validation status
  // ─────────────────────────────────────────────────────────

  /**
   * Probes JIRA and GitHub for the team's stored credentials and reports the
   * outcome of each check, plus a snapshot of the last sync. No secrets are
   * returned — only configuration metadata and probe results.
   */
  async getIntegrationStatus(teamId: string) {
    const team = await this.resolveTeam(teamId);
    if (!team) throw new NotFoundException(`Team ${teamId} not found.`);

    const jiraConfigured = !!(
      team.jiraDomain && team.jiraEmail && team.jiraApiToken && team.jiraProjectKey
    );
    const githubConfigured = !!team.githubRepositoryId;

    const result: any = {
      teamId,
      name: team.name,
      groupId: team.groupId ?? null,
      jira: {
        configured: jiraConfigured,
        domain: team.jiraDomain || null,
        email: team.jiraEmail || null,
        projectKey: team.jiraProjectKey || null,
        boardId: team.jiraBoardId || null,
        storyPointsField: team.jiraStoryPointsField || 'customfield_10016',
        hasToken: !!team.jiraApiToken,
        checks: {
          auth: { ok: false, status: null as number | null, message: null as string | null },
          project: { ok: false, status: null as number | null, message: null as string | null },
          board: { ok: false, status: null as number | null, message: null as string | null },
          activeSprint: { ok: false, sprintId: null as string | null, name: null as string | null, startDate: null as string | null, endDate: null as string | null },
        },
      },
      github: {
        configured: githubConfigured,
        repository: team.githubRepositoryId || null,
        hasToken: !!team.githubToken,
        checks: {
          repo: { ok: false, status: null as number | null, message: null as string | null, private: null as boolean | null },
        },
      },
      lastSync: {
        syncedAt: null as Date | null,
        totalIssues: 0,
        verifiedIssues: 0,
        lockedIssues: 0,
      },
    };

    // JIRA probes
    if (jiraConfigured) {
      const auth = this.buildAuthHeader(team);
      // 1) auth — /myself returns 200 if creds are valid
      try {
        const res: any = await lastValueFrom(
          this.httpService.get(`https://${team.jiraDomain}/rest/api/3/myself`, {
            headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
            timeout: 5000,
          }),
        );
        result.jira.checks.auth = { ok: true, status: res.status, message: null };
      } catch (err: any) {
        result.jira.checks.auth = {
          ok: false,
          status: err?.response?.status ?? null,
          message: err?.response?.data?.message ?? err?.message ?? 'Auth failed',
        };
      }

      // 2) project — /project/{key}
      if (result.jira.checks.auth.ok) {
        try {
          const res: any = await lastValueFrom(
            this.httpService.get(
              `https://${team.jiraDomain}/rest/api/3/project/${team.jiraProjectKey}`,
              { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' }, timeout: 5000 },
            ),
          );
          result.jira.checks.project = { ok: true, status: res.status, message: null };
        } catch (err: any) {
          result.jira.checks.project = {
            ok: false,
            status: err?.response?.status ?? null,
            message: err?.response?.data?.errorMessages?.[0] ?? err?.message ?? 'Project not found',
          };
        }
      }

      // 3) board — /board/{boardId} (only if boardId is set)
      if (team.jiraBoardId && result.jira.checks.auth.ok) {
        try {
          const res: any = await lastValueFrom(
            this.httpService.get(
              `https://${team.jiraDomain}/rest/agile/1.0/board/${team.jiraBoardId}`,
              { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' }, timeout: 5000 },
            ),
          );
          result.jira.checks.board = { ok: true, status: res.status, message: null };
        } catch (err: any) {
          result.jira.checks.board = {
            ok: false,
            status: err?.response?.status ?? null,
            message: err?.response?.data?.errorMessages?.[0] ?? err?.message ?? 'Board not found',
          };
        }

        // 4) active sprint
        if (result.jira.checks.board.ok) {
          try {
            const res: any = await lastValueFrom(
              this.httpService.get(
                `https://${team.jiraDomain}/rest/agile/1.0/board/${team.jiraBoardId}/sprint`,
                {
                  params: { state: 'active' },
                  headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
                  timeout: 5000,
                },
              ),
            );
            const sprints: any[] = res.data?.values ?? [];
            const active = sprints[0];
            if (active) {
              result.jira.checks.activeSprint = {
                ok: true,
                sprintId: active.id?.toString() ?? null,
                name: active.name ?? null,
                startDate: active.startDate ?? null,
                endDate: active.endDate ?? null,
              };
            }
          } catch {
            // leave defaults
          }
        }
      }
    }

    // GitHub probe
    if (githubConfigured) {
      const headers: Record<string, string> = {
        'User-Agent': 'senior-app',
        Accept: 'application/vnd.github+json',
      };
      if (team.githubToken) {
        headers['Authorization'] = `Bearer ${decryptSecret(team.githubToken)}`;
      }
      try {
        const res: any = await lastValueFrom(
          this.httpService.get(
            `https://api.github.com/repos/${team.githubRepositoryId}`,
            { headers, timeout: 5000 },
          ),
        );
        result.github.checks.repo = {
          ok: true,
          status: res.status,
          message: null,
          private: !!res.data?.private,
        };
      } catch (err: any) {
        result.github.checks.repo = {
          ok: false,
          status: err?.response?.status ?? null,
          message: err?.response?.data?.message ?? err?.message ?? 'Repo unreachable',
          private: null,
        };
      }
    }

    // Last sync snapshot from sprintstories
    const stories = await this.sprintStoryModel
      .find({ teamId })
      .select('syncedAt githubStatus isLocked')
      .lean()
      .exec();
    if (stories.length > 0) {
      result.lastSync.totalIssues = stories.length;
      result.lastSync.verifiedIssues = stories.filter(
        (s) => s.githubStatus === GithubStatus.VERIFIED,
      ).length;
      result.lastSync.lockedIssues = stories.filter((s) => s.isLocked).length;
      result.lastSync.syncedAt = stories.reduce<Date>((latest, s) => {
        const d = s.syncedAt ? new Date(s.syncedAt) : new Date(0);
        return d > latest ? d : latest;
      }, new Date(0));
      if (result.lastSync.syncedAt.getTime() === 0) result.lastSync.syncedAt = null;
    }

    return result;
  }

  // ─────────────────────────────────────────────────────────
  // PUBLIC: Manual / cron-triggered sync
  // ─────────────────────────────────────────────────────────

  async syncStories(teamId: string) {
    const team = await this.resolveTeam(teamId);
    if (!team) throw new NotFoundException(`Team ${teamId} not found.`);

    if (!team.jiraDomain || !team.jiraApiToken || !team.jiraProjectKey || !team.jiraEmail) {
      throw new BadRequestException('JIRA credentials are not configured for this team.');
    }

    const syncRunId = randomUUID();
    const syncedAt = new Date();

    try {
      const issues = await this.fetchJiraIssues(team);
      const studentByAccountId = await this.buildAccountIdMap(team);

      this.logger.log(
        `[sync ${teamId}] fetched ${issues.length} issues from JIRA (${team.jiraDomain}/${team.jiraProjectKey}).`,
      );

      // Debug: dump first issue's raw fields so misconfig (wrong story-points
      // field id, assignee shape) is obvious. Toggle with SYNC_DEBUG=1.
      if (process.env.SYNC_DEBUG === '1' && issues.length > 0) {
        const sample = issues[0];
        const fieldKeys = Object.keys(sample.fields ?? {});
        const storyPointsField = team.jiraStoryPointsField || 'customfield_10016';
        this.logger.warn(
          `[sync DEBUG] first issue ${sample.key}:\n` +
            `  configured storyPointsField = "${storyPointsField}"\n` +
            `  fields[${storyPointsField}] = ${JSON.stringify(sample.fields?.[storyPointsField])}\n` +
            `  fields.assignee = ${JSON.stringify(sample.fields?.assignee)}\n` +
            `  available field keys: ${fieldKeys.join(', ')}\n` +
            `  any "customfield_*" with non-null value: ${fieldKeys
              .filter((k) => k.startsWith('customfield_') && sample.fields[k] !== null && sample.fields[k] !== undefined)
              .map((k) => `${k}=${JSON.stringify(sample.fields[k]).slice(0, 60)}`)
              .join('; ') || '(none)'}`,
        );
      }

      // Build a parallel map: studentId → githubUsername, so we can compare PR
      // authors to the JIRA assignee's linked GitHub account.
      const githubByStudentId = await this.buildGithubLoginMap(team);

      let linkedCount = 0;
      for (const issue of issues) {
        if (await this.isLocked(teamId, issue.key)) {
          this.logger.log(`  • ${issue.key}  [LOCKED — sprint already finalized, skipping]`);
          continue;
        }

        const assigneeAccountId: string | null = issue.fields?.assignee?.accountId ?? null;
        const assigneeStudentId = assigneeAccountId
          ? (studentByAccountId.get(assigneeAccountId) ?? null)
          : null;

        const expectedAuthorLogin = assigneeStudentId
          ? githubByStudentId.get(assigneeStudentId) ?? null
          : null;

        const githubResult = team.githubRepositoryId
          ? await this.verifyGithub(team, issue.key, expectedAuthorLogin)
          : {
              githubStatus: GithubStatus.NO_BRANCH,
              verifiedAt: null,
              branchFound: false,
              prFound: false,
              prAuthorLogin: null,
              prNumber: null as number | null,
              prUpdatedAt: null as string | null,
            };

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

        // AI review-quality evaluation. Only meaningful when a real PR exists
        // (merged or otherwise). Cached on (issue, prUpdatedAt) — repeat syncs
        // for an unchanged PR don't re-spend AI quota.
        const reviewQuality = await this.evaluateReviewQuality(
          team,
          teamId,
          issue.key,
          githubResult,
        );

        const assigneeLabel = assigneeAccountId
          ? assigneeStudentId
            ? `student ${assigneeStudentId.slice(-6)}`
            : `unmapped accountId ${assigneeAccountId.slice(-8)}`
          : 'no assignee';
        const authorTrace = githubResult.prAuthorLogin
          ? `pr@${githubResult.prAuthorLogin}${
              expectedAuthorLogin ? ` (expected @${expectedAuthorLogin})` : ' (assignee github not linked)'
            }`
          : '';
        this.logger.log(
          `  • ${issue.key.padEnd(10)}  ` +
            `pts=${String(work).padEnd(3)}  ` +
            `jira=${(resolution ?? 'open').padEnd(8)}  ` +
            `github=${githubResult.githubStatus.padEnd(16)}  ` +
            `complete=${isComplete ? 'YES' : 'no '}  ` +
            `${assigneeLabel}` +
            (authorTrace ? `  ${authorTrace}` : ''),
        );
        if (githubResult.githubStatus === GithubStatus.AUTHOR_MISMATCH) {
          this.logger.warn(
            `[sync ${teamId}] ${issue.key}: PR was authored by @${githubResult.prAuthorLogin} but JIRA assignee's linked GitHub is @${expectedAuthorLogin}. Issue NOT counted as complete.`,
          );
        }

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
              prAuthorLogin: githubResult.prAuthorLogin,
              prNumber: githubResult.prNumber,
              ...(reviewQuality !== undefined ? { reviewQuality } : {}),
              isComplete,
              syncRunId,
              syncedAt,
            },
          },
          { upsert: true, new: true },
        ).exec();
      }

      // Summary tally
      const fresh = await this.sprintStoryModel
        .find({ teamId })
        .select('githubStatus isComplete work assigneeStudentId')
        .lean()
        .exec();
      const verified = fresh.filter((s) => s.githubStatus === GithubStatus.VERIFIED).length;
      const completed = fresh.filter((s) => s.isComplete).length;
      const unassigned = fresh.filter((s) => !s.assigneeStudentId).length;
      const totalPoints = fresh
        .filter((s) => s.isComplete)
        .reduce((sum, s) => sum + (s.work ?? 0), 0);

      this.logger.log(
        `[sync ${teamId}] DONE: total=${issues.length} linked=${linkedCount} verified=${verified} complete=${completed} (${totalPoints} pts) unassigned=${unassigned}`,
      );
      if (unassigned > 0) {
        this.logger.warn(
          `[sync ${teamId}] ${unassigned} issue(s) have no mapped student — those students need to bind their JIRA accountId at /integrations.`,
        );
      }
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

  async finalizeSprintSync(teamId: string, sprintId: string, _groupId?: string): Promise<{
    lockedCount: number;
    studentRecords: { studentId: string; completedPoints: number; targetPoints: number }[];
  }> {
    const team = await this.resolveTeam(teamId);
    if (!team) throw new NotFoundException(`Team ${teamId} not found.`);

    // SprintConfigEntry is global (keyed by sprintId only). The team supplies
    // its own groupId so per-student StoryPointRecords stay scoped per team/group.
    const groupId = (team as any).groupId as string | undefined;
    if (!groupId) {
      throw new BadRequestException(
        `Team ${teamId} has no groupId; cannot persist per-student story points.`,
      );
    }

    const sprintConfig = await this.sprintConfigModel.findOne({ sprintId }).exec();
    if (!sprintConfig) {
      throw new BadRequestException(`SprintConfig not found for sprintId=${sprintId}`);
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
    const team = await this.resolveTeam(teamId);
    if (!team) throw new NotFoundException(`Team ${teamId} not found.`);

    return this.sprintStoryModel
      .find({ teamId })
      .select('issueKey summary status resolution work assignee assigneeStudentId githubStatus verifiedAt isComplete isLocked syncedAt prAuthorLogin prNumber reviewQuality -_id')
      .sort({ issueKey: 1 })
      .lean()
      .exec();
  }

  // ─────────────────────────────────────────────────────────
  // PUBLIC: Story points summary (completed vs total)
  // ─────────────────────────────────────────────────────────

  async getStoryPointsSummary(teamId: string): Promise<{ completedStoryPoints: number; totalStoryPoints: number }> {
    const team = await this.resolveTeam(teamId);
    if (!team) throw new NotFoundException(`Team ${teamId} not found.`);

    const stories = await this.sprintStoryModel
      .find({ teamId })
      .select('work isComplete -_id')
      .lean()
      .exec();

    const totalStoryPoints = stories.reduce((sum, s) => sum + (s.work ?? 0), 0);
    const completedStoryPoints = stories
      .filter((s) => s.isComplete)
      .reduce((sum, s) => sum + (s.work ?? 0), 0);

    return { completedStoryPoints, totalStoryPoints };
  }

  // ─────────────────────────────────────────────────────────
  // PUBLIC: Advisor panel aggregation
  // ─────────────────────────────────────────────────────────

  async getAdvisorPanel(teamId: string, groupId?: string): Promise<AdvisorPanelResult> {
    const team = await this.resolveTeam(teamId);
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

    // SprintConfigEntry is global (no groupId); pick the most recently created one.
    let targetPoints = 0;
    const latestConfig = await this.sprintConfigModel
      .findOne()
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    if (latestConfig) targetPoints = latestConfig.targetStoryPoints;

    // Resolve student names + final grades for everyone with assigned issues
    const assignedStudentIds = [...byStudent.keys()].filter(
      (sid) => sid !== '__unassigned__',
    );
    const teamGroupId = (team as any).groupId as string | undefined;

    const [userDocs, studentGradeDocs, groupGradeDoc] = await Promise.all([
      assignedStudentIds.length > 0
        ? this.userModel
            .find({ _id: { $in: assignedStudentIds } })
            .select('_id firstName lastName name email')
            .lean()
            .exec()
        : Promise.resolve([] as any[]),
      teamGroupId
        ? this.studentFinalGradeModel
            .find({ groupId: teamGroupId, studentId: { $in: assignedStudentIds } })
            .lean()
            .exec()
        : Promise.resolve([] as any[]),
      teamGroupId
        ? this.groupFinalGradeModel.findOne({ groupId: teamGroupId }).lean().exec()
        : Promise.resolve(null as any),
    ]);

    const userMap = new Map<string, { name: string | null; email: string | null }>(
      (userDocs as any[]).map((u) => {
        const composite =
          [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
          (u.name as string | undefined) ||
          null;
        return [String(u._id), { name: composite, email: u.email ?? null }];
      }),
    );
    const studentGradeMap = new Map<string, any>(
      (studentGradeDocs as any[]).map((g) => [g.studentId, g]),
    );

    const students: AdvisorPanelStudent[] = [];
    for (const [studentId, studentStories] of byStudent) {
      if (studentId === '__unassigned__') continue;

      const completedPoints = studentStories
        .filter((s) => s.isComplete)
        .reduce((sum, s) => sum + (s.work ?? 0), 0);

      const individualRatio = targetPoints > 0
        ? Math.min(1, completedPoints / targetPoints)
        : 1.0;

      const userInfo = userMap.get(studentId);
      const grade = studentGradeMap.get(studentId);

      students.push({
        studentId,
        studentName: userInfo?.name ?? null,
        studentEmail: userInfo?.email ?? null,
        finalGrade: grade?.finalGrade ?? null,
        individualAllowanceRatio: grade?.individualAllowanceRatio ?? null,
        completedIssues: studentStories.map((s) => ({
          issueKey: s.issueKey,
          summary: s.summary,
          work: s.work ?? 0,
          resolution: s.resolution ?? null,
          githubStatus: s.githubStatus as GithubStatus,
          verifiedAt: s.verifiedAt ?? null,
          isComplete: s.isComplete ?? false,
          reviewQuality: s.reviewQuality
            ? {
                hasMeaningfulReview: s.reviewQuality.hasMeaningfulReview,
                score: s.reviewQuality.score,
                reasoning: s.reviewQuality.reasoning,
              }
            : null,
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
      teamGrade: (groupGradeDoc as any)?.teamGrade ?? null,
      teamGradeCalculatedAt: (groupGradeDoc as any)?.calculatedAt ?? null,
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
    expectedAuthorLogin: string | null,
  ): Promise<{
    githubStatus: GithubStatus;
    verifiedAt: Date | null;
    branchFound: boolean;
    prFound: boolean;
    prAuthorLogin: string | null;
    prNumber: number | null;
    prUpdatedAt: string | null;
  }> {
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
      return { githubStatus: GithubStatus.NO_BRANCH, verifiedAt: null, branchFound: false, prFound: false, prAuthorLogin: null, prNumber: null, prUpdatedAt: null };
    }

    // Step 2: find PR for that branch
    const pr = await this.findPullRequest(
      team.githubRepositoryId,
      issueKey,
      branchName,
      headers,
    );

    if (!pr) {
      return { githubStatus: GithubStatus.NO_PR, verifiedAt: null, branchFound: true, prFound: false, prAuthorLogin: null, prNumber: null, prUpdatedAt: null };
    }

    const prAuthorLogin: string | null = pr.user?.login ?? null;
    const prNumber: number | null = typeof pr.number === 'number' ? pr.number : null;
    const prUpdatedAt: string | null = pr.updated_at ?? null;

    // Step 3: check merge status
    if (!pr.merged_at) {
      return { githubStatus: GithubStatus.PR_NOT_MERGED, verifiedAt: null, branchFound: true, prFound: true, prAuthorLogin, prNumber, prUpdatedAt };
    }

    // Step 4: author check — only verifies when we know the assignee's GitHub
    // login. Missing assignee or unlinked GitHub account → can't verify, treat
    // as full verified (we don't downgrade based on missing data, only on real
    // mismatches), because otherwise students who haven't OAuth-linked GitHub
    // would block their teammates' completion.
    if (
      expectedAuthorLogin &&
      prAuthorLogin &&
      expectedAuthorLogin.toLowerCase() !== prAuthorLogin.toLowerCase()
    ) {
      return {
        githubStatus: GithubStatus.AUTHOR_MISMATCH,
        verifiedAt: new Date(pr.merged_at),
        branchFound: true,
        prFound: true,
        prAuthorLogin,
        prNumber,
        prUpdatedAt,
      };
    }

    return {
      githubStatus: GithubStatus.VERIFIED,
      verifiedAt: new Date(pr.merged_at),
      branchFound: true,
      prFound: true,
      prAuthorLogin,
      prNumber,
      prUpdatedAt,
    };
  }

  /**
   * Decide whether to call the AI to evaluate the PR's review quality.
   * Returns:
   *   - undefined → skip the field entirely on this update (no PR / no AI / cache hit)
   *   - object    → write/refresh reviewQuality
   *   - null      → AI was attempted but failed; clear stale cache to avoid lying
   */
  private async evaluateReviewQuality(
    team: TeamDocument,
    teamId: string,
    issueKey: string,
    githubResult: {
      prFound: boolean;
      prNumber: number | null;
      prUpdatedAt: string | null;
    },
  ): Promise<
    | undefined
    | null
    | {
        hasMeaningfulReview: boolean;
        score: number;
        reasoning: string;
        evaluatedAt: Date;
        prUpdatedAt: string | null;
      }
  > {
    if (!githubResult.prFound || !githubResult.prNumber || !team.githubRepositoryId) {
      return undefined;
    }
    if (!this.geminiService.isAvailable()) {
      return undefined;
    }

    // Cache check — same prUpdatedAt → reuse last verdict.
    // Bypass with AI_SKIP_CACHE=1 (dev/testing).
    const existing = await this.sprintStoryModel
      .findOne({ teamId, issueKey })
      .select('reviewQuality')
      .lean()
      .exec();
    if (
      process.env.AI_SKIP_CACHE !== '1' &&
      existing?.reviewQuality &&
      githubResult.prUpdatedAt &&
      existing.reviewQuality.prUpdatedAt === githubResult.prUpdatedAt
    ) {
      this.logger.log(
        `  ↳ ${issueKey} AI cache hit (prUpdatedAt=${githubResult.prUpdatedAt}); set AI_SKIP_CACHE=1 to force re-evaluate.`,
      );
      return undefined;
    }
    this.logger.log(
      `  ↳ ${issueKey} AI evaluating (cached=${existing?.reviewQuality?.prUpdatedAt ?? 'none'}, fresh=${githubResult.prUpdatedAt ?? 'none'})`,
    );

    const headers: Record<string, string> = {
      'User-Agent': 'senior-app',
      Accept: 'application/vnd.github+json',
    };
    if (team.githubToken) {
      headers['Authorization'] = `Bearer ${decryptSecret(team.githubToken)}`;
    }

    const [reviews, comments, prMeta] = await Promise.all([
      this.fetchPrReviews(team.githubRepositoryId, githubResult.prNumber, headers),
      this.fetchPrReviewComments(team.githubRepositoryId, githubResult.prNumber, headers),
      this.fetchPrMeta(team.githubRepositoryId, githubResult.prNumber, headers),
    ]);

    const verdict = await this.geminiService.evaluatePrReview({
      prTitle: prMeta?.title ?? issueKey,
      prBody: prMeta?.body ?? null,
      reviews,
      comments,
    });

    if (!verdict) {
      this.logger.warn(
        `[sync ${teamId}] ${issueKey}: AI review evaluation unavailable, leaving previous reviewQuality untouched.`,
      );
      return undefined;
    }

    this.logger.log(
      `  ↳ ${issueKey} review: meaningful=${verdict.hasMeaningfulReview} score=${verdict.score} "${verdict.reasoning.slice(0, 80)}"`,
    );

    return {
      hasMeaningfulReview: verdict.hasMeaningfulReview,
      score: verdict.score,
      reasoning: verdict.reasoning,
      evaluatedAt: new Date(),
      prUpdatedAt: githubResult.prUpdatedAt,
    };
  }

  private async fetchPrMeta(
    repoId: string,
    prNumber: number,
    headers: Record<string, string>,
  ): Promise<{ title: string; body: string | null } | null> {
    try {
      const res: any = await lastValueFrom(
        this.httpService.get(
          `https://api.github.com/repos/${repoId}/pulls/${prNumber}`,
          { headers },
        ),
      );
      return {
        title: res.data?.title ?? '',
        body: res.data?.body ?? null,
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetch PR-level reviews (Approve / Request Changes / Comment events).
   * Returns [] on error so sync flow is not interrupted.
   */
  private async fetchPrReviews(
    repoId: string,
    prNumber: number,
    headers: Record<string, string>,
  ): Promise<Array<{ author: string | null; state: string; body: string | null; submittedAt: string | null }>> {
    try {
      const res: any = await lastValueFrom(
        this.httpService.get(
          `https://api.github.com/repos/${repoId}/pulls/${prNumber}/reviews`,
          { headers, params: { per_page: 100 } },
        ),
      );
      const reviews: any[] = res.data ?? [];
      return reviews.map((r) => ({
        author: r.user?.login ?? null,
        state: r.state ?? 'COMMENTED',
        body: r.body ?? null,
        submittedAt: r.submitted_at ?? null,
      }));
    } catch (err: any) {
      this.logger.warn(`fetchPrReviews(${repoId}#${prNumber}) failed: ${err?.message ?? err}`);
      return [];
    }
  }

  /**
   * Fetch inline review comments (file/line-level threaded comments).
   */
  private async fetchPrReviewComments(
    repoId: string,
    prNumber: number,
    headers: Record<string, string>,
  ): Promise<Array<{ author: string | null; body: string | null; path: string | null }>> {
    try {
      const res: any = await lastValueFrom(
        this.httpService.get(
          `https://api.github.com/repos/${repoId}/pulls/${prNumber}/comments`,
          { headers, params: { per_page: 100 } },
        ),
      );
      const comments: any[] = res.data ?? [];
      return comments.map((c) => ({
        author: c.user?.login ?? null,
        body: c.body ?? null,
        path: c.path ?? null,
      }));
    } catch (err: any) {
      this.logger.warn(`fetchPrReviewComments(${repoId}#${prNumber}) failed: ${err?.message ?? err}`);
      return [];
    }
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
    // User.teamId actually stores the Group.groupId (UUID), not the Team's
    // mongo _id. Match users by team.groupId. If a team has no groupId yet
    // (legacy/seeded), fall back to all users with a JIRA accountId so the
    // mapping degrades gracefully instead of returning everyone as unmapped.
    const filter: Record<string, unknown> = { jiraAccountId: { $ne: null } };
    if (team.groupId) {
      filter.teamId = team.groupId;
    }

    const users = await this.userModel
      .find(filter)
      .select('_id jiraAccountId')
      .lean()
      .exec();

    const map = new Map<string, string>();
    for (const u of users) {
      if (u.jiraAccountId) {
        // Strip any querystring (e.g. "?cloudId=...") that users sometimes
        // paste from a JIRA profile URL.
        const cleanId = u.jiraAccountId.split('?')[0].trim();
        map.set(cleanId, (u._id as any).toString());
      }
    }

    this.logger.log(
      `[sync ${(team._id as any).toString()}] accountId map built: ${map.size} user(s) for groupId=${team.groupId ?? '(none)'}`,
    );
    return map;
  }

  /**
   * Returns map: studentId → linked GitHub username. Empty entries (students
   * who never OAuth-linked GitHub) are omitted, so author-check becomes a
   * "best-effort verify when we have the link" rather than a hard block.
   */
  private async buildGithubLoginMap(team: TeamDocument): Promise<Map<string, string>> {
    const filter: Record<string, unknown> = {
      githubUsername: { $nin: [null, ''] },
    };
    if (team.groupId) filter.teamId = team.groupId;

    const users = await this.userModel
      .find(filter)
      .select('_id githubUsername')
      .lean()
      .exec();

    const map = new Map<string, string>();
    for (const u of users) {
      if (u.githubUsername) {
        map.set((u._id as any).toString(), u.githubUsername);
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
