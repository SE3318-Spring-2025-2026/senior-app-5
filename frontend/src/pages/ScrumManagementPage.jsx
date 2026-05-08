import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import { PageHeader } from '../components/ui';

const parseApiMessage = (error, fallback) => {
  const message = error?.response?.data?.message;
  if (Array.isArray(message) && message.length > 0) return message.join(', ');
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

function ScrumManagementPage() {
  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const role = user?.role || '';
  const isTeamLeader = role === 'TeamLeader';
  const isCoordinator = role === 'Coordinator';
  const canView = isTeamLeader || isCoordinator;
  const canSync = isTeamLeader;
  const teamId = user?.teamId || user?.groupId || '';

  const [teamData, setTeamData] = useState(null);
  const [syncSummary, setSyncSummary] = useState(null);
  const [issues, setIssues] = useState([]);
  const [storyPoints, setStoryPoints] = useState(null);

  const [loading, setLoading] = useState({
    team: false,
    syncData: false,
    storyPoints: false,
    syncAction: false,
  });

  const [errors, setErrors] = useState({
    general: '',
    team: '',
    syncData: '',
    storyPoints: '',
    syncAction: '',
  });

  const setInlineError = (key, message) =>
    setErrors((prev) => ({ ...prev, [key]: message || '' }));

  const credentialsHelp =
    'JIRA/GitHub credentials are not configured for this team. Please configure integrations first.';

  const loadTeamData = useCallback(async () => {
    if (!teamId) {
      setInlineError('team', 'No team is assigned to your account.');
      return;
    }

    setLoading((prev) => ({ ...prev, team: true }));
    setInlineError('team', '');

    try {
      // Use the integrations/status endpoint which exists on the backend
      const response = await apiClient.get(apiConfig.endpoints.teamIntegrationsStatus(teamId));
      setTeamData(response.data || null);
    } catch (error) {
      setInlineError('team', parseApiMessage(error, 'Failed to load team integration status.'));
    } finally {
      setLoading((prev) => ({ ...prev, team: false }));
    }
  }, [teamId]);

  const loadSyncData = useCallback(async () => {
    if (!teamId) return;

    setLoading((prev) => ({ ...prev, syncData: true }));
    setInlineError('syncData', '');

    try {
      const response = await apiClient.get(apiConfig.endpoints.teamSync(teamId));
      const data = response.data || {};

      const summary = {
        syncRunId: data.syncRunId || data.lastSyncRunId || '',
        totalIssues: data.totalIssues ?? 0,
        linkedCount: data.linkedCount ?? 0,
        syncedAt: data.syncedAt || data.lastSyncedAt || null,
      };

      const issueRows = Array.isArray(data.issues)
        ? data.issues
        : Array.isArray(data.data)
        ? data.data
        : [];

      setSyncSummary(summary);
      setIssues(issueRows);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 400) {
        setInlineError('syncData', credentialsHelp);
      } else if (status === 404) {
        setInlineError('syncData', 'No sync run found yet. Run your first sync.');
      } else {
        setInlineError('syncData', parseApiMessage(error, 'Failed to load sync results.'));
      }
    } finally {
      setLoading((prev) => ({ ...prev, syncData: false }));
    }
  }, [teamId]);

  const loadStoryPoints = useCallback(async () => {
    if (!teamId) return;

    setLoading((prev) => ({ ...prev, storyPoints: true }));
    setInlineError('storyPoints', '');

    try {
      const response = await apiClient.get(apiConfig.endpoints.teamStoryPoints(teamId));
      setStoryPoints(response.data || null);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 400) {
        setInlineError('storyPoints', credentialsHelp);
      } else {
        setInlineError('storyPoints', parseApiMessage(error, 'Failed to load story-point summary.'));
      }
    } finally {
      setLoading((prev) => ({ ...prev, storyPoints: false }));
    }
  }, [teamId]);

  const handleSyncStories = async () => {
    if (!teamId || !canSync) return;

    setLoading((prev) => ({ ...prev, syncAction: true }));
    setInlineError('syncAction', '');

    try {
      const response = await apiClient.post(apiConfig.endpoints.teamSync(teamId));
      const data = response.data || {};

      setSyncSummary({
        syncRunId: data.syncRunId || '',
        totalIssues: data.totalIssues ?? 0,
        linkedCount: data.linkedCount ?? 0,
        syncedAt: data.syncedAt || null,
      });

      await Promise.all([loadSyncData(), loadStoryPoints()]);
    } catch (error) {
      if (error?.response?.status === 400) {
        setInlineError('syncAction', credentialsHelp);
      } else {
        setInlineError('syncAction', parseApiMessage(error, 'Sync failed. Please try again.'));
      }
    } finally {
      setLoading((prev) => ({ ...prev, syncAction: false }));
    }
  };

  useEffect(() => {
    if (!canView) {
      setInlineError('general', 'You are not authorized to view Scrum Management.');
      return;
    }

    (async () => {
      await Promise.all([loadTeamData(), loadSyncData(), loadStoryPoints()]);
    })();
  }, [canView, loadSyncData, loadStoryPoints, loadTeamData]);

  const completedPoints = storyPoints?.completedStoryPoints ?? storyPoints?.completed ?? 0;
  const totalPoints = storyPoints?.totalStoryPoints ?? storyPoints?.total ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Scrum Management"
        subtitle={
          isCoordinator
            ? 'View team Jira sync health in read-only mode.'
            : 'Sync Jira stories and review GitHub validation status.'
        }
      />

      {errors.general && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {errors.general}
        </div>
      )}

      {!errors.general && (
        <>
          <section className="rounded-2xl border border-[#1e293b] bg-[#111827] p-5">
            <h2 className="text-sm font-bold text-slate-200 mb-3">Integration Status</h2>
            {loading.team ? (
              <p className="text-sm text-slate-500">Loading integration data...</p>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="text-slate-300">
                  Jira Project Key: <span className="text-slate-100">{teamData?.jira?.projectKey || 'Not configured'}</span>
                </p>
                <p className="text-slate-300">
                  Jira Domain: <span className="text-slate-100">{teamData?.jira?.domain || 'Not configured'}</span>
                </p>
                <p className="text-slate-300">
                  GitHub Repository ID:{' '}
                  <span className="text-slate-100">{teamData?.github?.repository || 'Not configured'}</span>
                </p>
                <p className="text-xs text-slate-400">
                  Update integrations from <Link className="text-blue-400 hover:underline" to="/integrations">Integrations</Link>.
                </p>
              </div>
            )}
            {errors.team && (
              <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {errors.team}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-[#1e293b] bg-[#111827] p-5">
            <h2 className="text-sm font-bold text-slate-200 mb-3">Sync</h2>
            <button
              type="button"
              onClick={handleSyncStories}
              disabled={!canSync || loading.syncAction}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading.syncAction ? 'Syncing...' : 'Sync Stories'}
            </button>
            {!canSync && <p className="text-xs text-slate-500 mt-2">Read-only access for coordinators.</p>}

            <div className="mt-4 space-y-1 text-sm text-slate-300">
              <p>Sync Run ID: <span className="text-slate-100">{syncSummary?.syncRunId || 'No sync yet'}</span></p>
              <p>Total Issues: <span className="text-slate-100">{syncSummary?.totalIssues ?? 0}</span></p>
              <p>Linked Count: <span className="text-slate-100">{syncSummary?.linkedCount ?? 0}</span></p>
              <p>Synced At: <span className="text-slate-100">{formatDate(syncSummary?.syncedAt)}</span></p>
            </div>

            {errors.syncAction && (
              <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {errors.syncAction}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-[#1e293b] bg-[#111827] p-5">
            <h2 className="text-sm font-bold text-slate-200 mb-3">Story Points</h2>
            {loading.storyPoints ? (
              <p className="text-sm text-slate-500">Loading story-point summary...</p>
            ) : (
              <p className="text-sm text-slate-200">
                {completedPoints} / {totalPoints} story points completed
              </p>
            )}
            {errors.storyPoints && (
              <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {errors.storyPoints}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-[#1e293b] bg-[#111827] p-5">
            <h2 className="text-sm font-bold text-slate-200 mb-3">Per-Issue Validation</h2>

            {loading.syncData ? (
              <p className="text-sm text-slate-500">Loading issue rows...</p>
            ) : issues.length === 0 ? (
              <p className="text-sm text-slate-500">No sync data available yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-[#1e293b]">
                      <th className="py-2 pr-4">Issue Key</th>
                      <th className="py-2 pr-4">Summary</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Branch Found</th>
                      <th className="py-2">PR Found</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map((issue) => {
                      const branchFound = Boolean(issue.githubBranchFound);
                      const prFound = Boolean(issue.githubPrFound);
                      const rowClass = !branchFound || !prFound ? 'bg-amber-500/10' : '';

                      return (
                        <tr key={issue.issueKey || issue.key} className={`border-b border-[#1e293b] ${rowClass}`}>
                          <td className="py-2 pr-4 text-slate-100">{issue.issueKey || issue.key || '—'}</td>
                          <td className="py-2 pr-4 text-slate-300">{issue.summary || '—'}</td>
                          <td className="py-2 pr-4 text-slate-300">{issue.status || '—'}</td>
                          <td className="py-2 pr-4 text-slate-300">{branchFound ? 'Yes' : 'No'}</td>
                          <td className="py-2 text-slate-300">{prFound ? 'Yes' : 'No'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {errors.syncData && (
              <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {errors.syncData}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default ScrumManagementPage;