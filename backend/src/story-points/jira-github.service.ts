import { Injectable, Logger } from '@nestjs/common';

export interface ExternalStoryPoints {
  studentId: string;
  completedPoints: number;
}

@Injectable()
export class JiraGithubService {
  private readonly logger = new Logger(JiraGithubService.name);

  /**
   * Fetches completed story points for the given students from JIRA/GitHub.
   * Throws an error (to be mapped to 502) when the external API is unreachable.
   */
  async fetchStoryPoints(
    groupId: string,
    sprintId: string,
    studentIds: string[],
  ): Promise<ExternalStoryPoints[]> {
    const apiUrl = process.env.JIRA_GITHUB_API_URL;

    if (!apiUrl) {
      this.logger.warn(
        `JIRA_GITHUB_API_URL not configured — returning zero points for group=${groupId} sprint=${sprintId}`,
      );
      return studentIds.map((id) => ({ studentId: id, completedPoints: 0 }));
    }

    try {
      const url = `${apiUrl}/groups/${groupId}/sprints/${sprintId}/story-points`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${process.env.JIRA_GITHUB_API_TOKEN ?? ''}` },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`External API responded with status ${response.status}`);
      }

      const data = (await response.json()) as ExternalStoryPoints[];
      return data.filter((r) => studentIds.includes(r.studentId));
    } catch (err) {
      this.logger.error(
        `JIRA/GitHub API unreachable for group=${groupId} sprint=${sprintId}: ${(err as Error).message}`,
      );
      throw err;
    }
  }
}
