import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Link2, RefreshCw, GitBranch, BarChart3, ClipboardCheck,
} from 'lucide-react';
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

function SectionLabel({ icon: Icon, children, action }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={13} className="text-zinc-600" />}
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {children}
        </span>
      </div>
      {action}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#1c1c20] py-2.5 last:border-b-0">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-600">{label}</span>
      <span className="truncate text-[13px] text-zinc-200">{value}</span>
    </div>
  );
}

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
      const response = await apiClient.get(`/teams/${teamId}`);
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
  const progressPct = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={isCoordinator ? 'Coordinator' : 'Team Leader'}
        title="Scrum Management"
        subtitle={
          isCoordinator
            ? 'View team Jira sync health in read-only mode.'
            : 'Sync Jira stories and review GitHub validation status.'
        }
      />

      {errors.general && (
        <div className="rounded-md border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-[13px] text-rose-300">
          {errors.general}
        </div>
      )}

      {!errors.general && (
        <>
          <section className="rounded-2xl border border-[#1f1f23] bg-[#131316] p-5">
            <SectionLabel icon={Link2}>Integration status</SectionLabel>

            {loading.team ? (
              <p className="text-[13px] text-zinc-600">Loading integration data…</p>
            ) : (
              <div className="rounded-xl border border-[#1f1f23] bg-[#0e0e10] px-4">
                <InfoRow
                  label="Jira project key"
                  value={teamData?.jiraProjectKey || 'Not configured'}
                />
                <InfoRow
                  label="Jira domain"
                  value={teamData?.jiraDomain || 'Not configured'}
                />
                <InfoRow
                  label="GitHub repository"
                  value={teamData?.githubRepositoryId || 'Not configured'}
                />
              </div>
            )}

            <p className="mt-3 text-[12px] text-zinc-500">
              Update integrations from{' '}
              <Link className="text-zinc-300 underline-offset-2 hover:text-zinc-100 hover:underline" to="/integrations">
                Integrations
              </Link>
              .
            </p>

            {errors.team && (
              <p className="mt-3 rounded-md border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-[13px] text-rose-300">
                {errors.team}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-[#1f1f23] bg-[#131316] p-5">
            <SectionLabel
              icon={RefreshCw}
              action={
                <button
                  type="button"
                  onClick={handleSyncStories}
                  disabled={!canSync || loading.syncAction}
                  className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-3.5 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#26262b] disabled:text-zinc-600"
                >
                  <RefreshCw size={12} className={loading.syncAction ? 'animate-spin' : ''} />
                  {loading.syncAction ? 'Syncing…' : 'Sync stories'}
                </button>
              }
            >
              Sync
            </SectionLabel>

            {!canSync && (
              <p className="mb-3 text-[12px] text-zinc-600">Read-only access for coordinators.</p>
            )}

            <div className="rounded-xl border border-[#1f1f23] bg-[#0e0e10] px-4">
              <InfoRow label="Sync run id" value={syncSummary?.syncRunId || 'No sync yet'} />
              <InfoRow label="Total issues" value={String(syncSummary?.totalIssues ?? 0)} />
              <InfoRow label="Linked count" value={String(syncSummary?.linkedCount ?? 0)} />
              <InfoRow label="Synced at" value={formatDate(syncSummary?.syncedAt)} />
            </div>

            {errors.syncAction && (
              <p className="mt-3 rounded-md border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-[13px] text-rose-300">
                {errors.syncAction}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-[#1f1f23] bg-[#131316] p-5">
            <SectionLabel icon={BarChart3}>Story points</SectionLabel>

            {loading.storyPoints ? (
              <p className="text-[13px] text-zinc-600">Loading story-point summary…</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] text-zinc-200 tabular-nums">
                    {completedPoints} / {totalPoints} story points completed
                  </span>
                  <span className="text-[11px] font-medium tabular-nums text-zinc-500">
                    {progressPct}%
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-[#1c1c20]">
                  <div
                    className="h-full rounded-full bg-zinc-300 transition-all duration-700"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            {errors.storyPoints && (
              <p className="mt-3 rounded-md border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-[13px] text-rose-300">
                {errors.storyPoints}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-[#1f1f23] bg-[#131316] p-5">
            <SectionLabel icon={ClipboardCheck}>Per-issue validation</SectionLabel>

            {loading.syncData ? (
              <p className="text-[13px] text-zinc-600">Loading issue rows…</p>
            ) : issues.length === 0 ? (
              <p className="text-[13px] text-zinc-600">No sync data available yet.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[#1f1f23]">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-[#1c1c20] bg-[#0e0e10] text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                        <th className="px-4 py-2.5">Issue key</th>
                        <th className="px-4 py-2.5">Summary</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5">Branch</th>
                        <th className="px-4 py-2.5">PR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issues.map((issue) => {
                        const branchFound = Boolean(issue.githubBranchFound);
                        const prFound = Boolean(issue.githubPrFound);
                        const warn = !branchFound || !prFound;
                        return (
                          <tr
                            key={issue.issueKey || issue.key}
                            className={`border-b border-[#1c1c20] last:border-b-0 ${
                              warn ? 'bg-amber-500/[0.04]' : ''
                            }`}
                          >
                            <td className="px-4 py-2.5 font-mono text-[12px] text-zinc-100">
                              {issue.issueKey || issue.key || '—'}
                            </td>
                            <td className="px-4 py-2.5 text-zinc-300">{issue.summary || '—'}</td>
                            <td className="px-4 py-2.5 text-zinc-400">{issue.status || '—'}</td>
                            <td className="px-4 py-2.5">
                              <span
                                className={`inline-flex h-1.5 w-1.5 rounded-full ${
                                  branchFound ? 'bg-emerald-400' : 'bg-amber-400'
                                }`}
                              />
                              <span className="ml-2 text-zinc-300">{branchFound ? 'Yes' : 'No'}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span
                                className={`inline-flex h-1.5 w-1.5 rounded-full ${
                                  prFound ? 'bg-emerald-400' : 'bg-amber-400'
                                }`}
                              />
                              <span className="ml-2 text-zinc-300">{prFound ? 'Yes' : 'No'}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {errors.syncData && (
              <p className="mt-3 rounded-md border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-[13px] text-rose-300">
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
