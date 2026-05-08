import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { lastValueFrom } from 'rxjs';
import { Team, TeamDocument } from './schemas/team.schema';
import { UpdateIntegrationsDto } from './dto/update-integrations.dto';
import { encryptSecret } from '../common/crypto/secret-cipher';
import { Group, GroupDocument } from '../groups/group.entity';

@Injectable()
export class TeamsService {
  constructor(
    private readonly httpService: HttpService,
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
  ) {}

  /**
   * Discovers JIRA configuration from a domain + email + API token (and
   * optional project key). Used by the integration wizard to auto-fill the
   * board id, story-points custom field, and the caller's accountId so the
   * leader does not have to look these up manually.
   *
   * Nothing is persisted here — the caller still submits the regular
   * /integrations form to save credentials.
   */
  async discoverJira(input: {
    jiraDomain: string;
    jiraEmail: string;
    jiraApiToken: string;
    jiraProjectKey?: string;
  }): Promise<{
    accountId: string | null;
    projects: Array<{ key: string; name: string }>;
    boards: Array<{ id: string; name: string; type: string }>;
    storyPointsFieldId: string | null;
    candidateStoryPointsFields: Array<{ id: string; name: string }>;
  }> {
    const { jiraDomain, jiraEmail, jiraApiToken, jiraProjectKey } = input;
    const auth = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64');
    const headers = { Authorization: `Basic ${auth}`, Accept: 'application/json' } as const;
    const base = `https://${jiraDomain}`;

    const safeData = async <T>(p: Promise<any>, fallback: T): Promise<T> => {
      try { const r = await p; return (r?.data ?? fallback) as T; } catch { return fallback; }
    };

    // 1) /myself — validates auth + gives accountId
    let accountId: string | null = null;
    try {
      const res: any = await lastValueFrom(
        this.httpService.get(`${base}/rest/api/3/myself`, { headers, timeout: 5000 }),
      );
      accountId = res.data?.accountId ?? null;
    } catch (err: any) {
      throw new HttpException(
        `JIRA auth failed (${err?.response?.status ?? 'no response'}). Check domain/email/API token.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // 2) projects (subset of what user can see) — used when project key is unknown
    const projectsData: any = await safeData(
      lastValueFrom(this.httpService.get(`${base}/rest/api/3/project/search`, {
        headers, timeout: 5000, params: { maxResults: 50 },
      })),
      { values: [] },
    );
    const projects: Array<{ key: string; name: string }> = (projectsData?.values ?? []).map(
      (p: any) => ({ key: p.key, name: p.name }),
    );

    // 3) boards for the given project key
    let boards: Array<{ id: string; name: string; type: string }> = [];
    if (jiraProjectKey) {
      const boardsData: any = await safeData(
        lastValueFrom(this.httpService.get(`${base}/rest/agile/1.0/board`, {
          headers, timeout: 5000,
          params: { projectKeyOrId: jiraProjectKey, maxResults: 50 },
        })),
        { values: [] },
      );
      boards = (boardsData?.values ?? []).map((b: any) => ({
        id: b.id?.toString(),
        name: b.name,
        type: b.type,
      }));
    }

    // 4) field directory — find Story Points custom field id
    const fieldsData: any = await safeData(
      lastValueFrom(this.httpService.get(`${base}/rest/api/3/field`, { headers, timeout: 5000 })),
      [],
    );
    const allFields: any[] = Array.isArray(fieldsData) ? fieldsData : [];
    const candidateStoryPointsFields = allFields
      .filter((f) => /story\s*point/i.test(f.name || ''))
      .map((f) => ({ id: f.id || f.key, name: f.name }));
    // Prefer "Story Points" exact match over "Story point estimate"
    const exact = candidateStoryPointsFields.find((f) => /^story points$/i.test(f.name));
    const storyPointsFieldId =
      (exact?.id ?? candidateStoryPointsFields[0]?.id ?? null) || null;

    return {
      accountId,
      projects,
      boards,
      storyPointsFieldId,
      candidateStoryPointsFields,
    };
  }

  /**
   * Returns groupIds advised by the given user (matches both legacy
   * `advisorUserId` and current `assignedAdvisorId` fields).
   */
  async findGroupIdsAdvisedBy(advisorUserId: string): Promise<string[]> {
    const docs = await this.groupModel
      .find({
        $or: [
          { advisorUserId },
          { assignedAdvisorId: advisorUserId },
        ],
      })
      .select('groupId')
      .lean()
      .exec();
    return docs.map((d) => d.groupId);
  }

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
      const headers: Record<string, string> = {
        'User-Agent': 'senior-app',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      };
      if (githubToken) headers['Authorization'] = `Bearer ${githubToken}`;
      await lastValueFrom(
        this.httpService.get(
          `https://api.github.com/repos/${githubRepositoryId}`,
          { headers, timeout: 5000 },
        ),
      );
    } catch (error: any) {
      const status = error?.response?.status;
      const ghMessage = error?.response?.data?.message;
      const tokenSent = !!githubToken;

      let detail = `GitHub returned ${status ?? 'no response'}`;
      if (status === 404) {
        detail = tokenSent
          ? `GitHub returned 404 for "${githubRepositoryId}". The repo may not exist, or your PAT lacks access to it. For private repos, classic PATs need the full "repo" scope; fine-grained PATs must list this repo under "Repository access".`
          : `GitHub returned 404 for "${githubRepositoryId}". If the repo is private, you must also provide a GitHub PAT.`;
      } else if (status === 401) {
        detail = 'GitHub returned 401 — the PAT is invalid, expired, or copied with whitespace.';
      } else if (status === 403) {
        detail = `GitHub returned 403${ghMessage ? ` — ${ghMessage}` : ''}. Rate limit or SSO authorization may be required for this token.`;
      } else if (ghMessage) {
        detail += ` — ${ghMessage}`;
      }

      throw new HttpException(detail, HttpStatus.UNPROCESSABLE_ENTITY);
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
      if (jiraStoryPointsField) updateFields.jiraStoryPointsField = jiraStoryPointsField;
      // groupId is set when the team is created (mirrored from the leader's
      // own group at /groups/my-team). The leader cannot reassign their team
      // to a different group through this endpoint — only fill in if the
      // existing team has no group yet (legacy/seeded teams).
      if (groupId) {
        const existing = await this.teamModel.findById(teamId).select('groupId').lean().exec();
        if (existing && !existing.groupId) {
          updateFields.groupId = groupId;
        }
      }

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
    const groupName = obj.groupId
      ? (await this.groupModel.findOne({ groupId: obj.groupId }).select('groupName').lean().exec())?.groupName ?? null
      : null;

    return {
      teamId: (team._id as any).toString(),
      name: obj.name,
      leaderId: obj.leaderId,
      groupId: obj.groupId ?? null,
      groupName,
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
   *
   * @param scopeGroupIds  When provided, restricts the result to teams whose
   *                       groupId is in this set (used for Professor scoping).
   */
  async listAll(scopeGroupIds?: string[]) {
    const filter: Record<string, unknown> = {};
    if (scopeGroupIds) {
      if (scopeGroupIds.length === 0) return [];
      filter.groupId = { $in: scopeGroupIds };
    }

    const docs = await this.teamModel
      .find(filter)
      .select('_id name leaderId groupId jiraProjectKey jiraDomain jiraBoardId jiraStoryPointsField githubRepositoryId')
      .sort({ name: 1 })
      .lean()
      .exec();

    // Resolve groupId → groupName in one query (no N+1).
    const groupIds = Array.from(
      new Set(docs.map((t) => t.groupId).filter((g): g is string => !!g)),
    );
    const groups = groupIds.length
      ? await this.groupModel
          .find({ groupId: { $in: groupIds } })
          .select('groupId groupName')
          .lean()
          .exec()
      : [];
    const nameByGroupId = new Map(groups.map((g) => [g.groupId, g.groupName]));

    return docs.map((t) => ({
      teamId: (t._id as any).toString(),
      name: t.name,
      leaderId: t.leaderId,
      groupId: t.groupId ?? null,
      groupName: t.groupId ? nameByGroupId.get(t.groupId) ?? null : null,
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