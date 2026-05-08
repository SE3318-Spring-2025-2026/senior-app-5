import { useEffect, useMemo, useState } from 'react';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import styles from './DocumentsPage.module.css';

const GITHUB_STATUS_LABEL = {
  no_branch: { label: 'No Branch', color: '#94a3b8' },
  no_pr: { label: 'No PR', color: '#f59e0b' },
  pr_not_merged: { label: 'PR Open', color: '#3b82f6' },
  verified: { label: 'Verified ✓', color: '#22c55e' },
};

function GithubBadge({ status }) {
  const cfg = GITHUB_STATUS_LABEL[status] ?? { label: status, color: '#94a3b8' };
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        background: cfg.color + '22',
        color: cfg.color,
        border: `1px solid ${cfg.color}55`,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
}

function StudentCard({ student }) {
  const [expanded, setExpanded] = useState(false);
  const pct = (student.individualRatio * 100).toFixed(0);
  const barColor = student.individualRatio >= 0.8 ? '#22c55e' : student.individualRatio >= 0.5 ? '#f59e0b' : '#ef4444';

  return (
    <div
      style={{
        background: '#1e293b',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
        border: '1px solid #334155',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ color: '#f8fafc', fontWeight: 600 }}>Student: </span>
          <span style={{ color: '#38bdf8' }}>{student.studentId}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            {student.completedPoints} / {student.targetPoints} pts
          </span>
          <span style={{ color: barColor, fontWeight: 700 }}>
            {pct}%
          </span>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              background: 'none', border: 'none', color: '#38bdf8',
              cursor: 'pointer', fontSize: '0.85rem',
            }}
          >
            {expanded ? '▲ Hide Issues' : '▼ Show Issues'} ({student.completedIssues.length})
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: '8px', background: '#0f172a', borderRadius: '4px', height: '6px' }}>
        <div
          style={{
            width: `${Math.min(100, student.individualRatio * 100)}%`,
            background: barColor,
            height: '100%',
            borderRadius: '4px',
            transition: 'width 0.3s',
          }}
        />
      </div>

      {/* Issue list */}
      {expanded && (
        <table className={styles.customTable} style={{ marginTop: '12px' }}>
          <thead>
            <tr>
              <th>Issue Key</th>
              <th>Summary</th>
              <th>Points</th>
              <th>Resolution</th>
              <th>GitHub Status</th>
              <th>Verified At</th>
            </tr>
          </thead>
          <tbody>
            {student.completedIssues.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#64748b' }}>
                  No issues assigned
                </td>
              </tr>
            ) : (
              student.completedIssues.map((issue) => (
                <tr
                  key={issue.issueKey}
                  style={{ background: issue.isComplete ? '#14532d22' : undefined }}
                >
                  <td style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{issue.issueKey}</td>
                  <td>{issue.summary}</td>
                  <td style={{ textAlign: 'center' }}>{issue.work}</td>
                  <td style={{ color: issue.resolution === 'Done' ? '#22c55e' : '#94a3b8' }}>
                    {issue.resolution ?? '—'}
                  </td>
                  <td>
                    <GithubBadge status={issue.githubStatus} />
                  </td>
                  <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                    {issue.verifiedAt ? new Date(issue.verifiedAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AdvisorSprintPanel() {
  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState([]);
  const [bootstrapError, setBootstrapError] = useState('');
  const [teamId, setTeamId] = useState('');

  const [data, setData] = useState(null);
  const [status, setStatus] = useState({ loading: false, error: '' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [teamsRes, groupsRes] = await Promise.all([
          apiClient.get(apiConfig.endpoints.teamsList),
          apiClient.get(apiConfig.endpoints.groups, { params: { page: 1, limit: 100 } }),
        ]);
        if (cancelled) return;
        setTeams(teamsRes.data ?? []);
        setGroups(groupsRes.data?.data ?? groupsRes.data ?? []);
      } catch (err) {
        if (cancelled) return;
        setBootstrapError(err?.response?.data?.message || 'Failed to load teams.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const selectedTeam = useMemo(
    () => teams.find((t) => t.teamId === teamId) || null,
    [teams, teamId],
  );

  const groupForTeam = useMemo(() => {
    if (!selectedTeam?.groupId) return null;
    return groups.find((g) => g.groupId === selectedTeam.groupId) || null;
  }, [selectedTeam, groups]);

  const load = async (e) => {
    e.preventDefault();
    if (!selectedTeam) return;
    setData(null);
    setStatus({ loading: true, error: '' });
    try {
      const params = selectedTeam.groupId ? { groupId: selectedTeam.groupId } : {};
      const res = await apiClient.get(
        apiConfig.endpoints.teamAdvisorPanel(selectedTeam.teamId),
        { params },
      );
      setData(res.data);
      setStatus({ loading: false, error: '' });
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Failed to load sprint data.';
      setStatus({ loading: false, error: msg });
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerSection}>
        <h1 className={styles.title}>ADVISOR SPRINT PANEL</h1>
        <p className={styles.description}>
          Live per-student JIRA/GitHub story progress for the current sprint.
        </p>
      </div>

      {bootstrapError && <div className={styles.errorBox}>{bootstrapError}</div>}

      {/* Lookup form */}
      <form
        onSubmit={load}
        style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}
      >
        <div style={{ flex: '1 1 280px' }}>
          <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>
            Team *
          </label>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            required
            style={{
              width: '100%', padding: '8px 12px', borderRadius: '6px',
              background: '#1e293b', border: '1px solid #334155', color: '#f8fafc',
            }}
          >
            <option value="">— Select a team —</option>
            {teams.map((t) => (
              <option key={t.teamId} value={t.teamId}>
                {t.name}
              </option>
            ))}
          </select>
          {selectedTeam && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>
              {groupForTeam
                ? <>Group: <strong style={{ color: '#cbd5e1' }}>{groupForTeam.groupName}</strong></>
                : 'No Group set — target points may show as 0.'}
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={status.loading || !teamId}
          style={{
            padding: '10px 20px', borderRadius: '6px', background: '#38bdf8',
            color: '#0f172a', fontWeight: 700, border: 'none',
            cursor: status.loading || !teamId ? 'not-allowed' : 'pointer',
            opacity: status.loading || !teamId ? 0.6 : 1,
          }}
        >
          {status.loading ? 'Loading…' : 'Load Panel'}
        </button>
      </form>

      {status.error && <div className={styles.errorBox}>{status.error}</div>}

      {data && (
        <>
          {/* Summary header */}
          <div
            style={{
              background: '#1e293b', borderRadius: '8px', padding: '16px',
              marginBottom: '20px', border: '1px solid #334155',
              display: 'flex', gap: '32px', flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Last Synced</div>
              <div style={{ color: '#f8fafc', fontWeight: 600 }}>
                {data.syncedAt ? new Date(data.syncedAt).toLocaleString() : 'Never'}
              </div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Total Issues</div>
              <div style={{ color: '#f8fafc', fontWeight: 600 }}>{data.totalIssues}</div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Verified Issues</div>
              <div style={{ color: '#22c55e', fontWeight: 600 }}>{data.verifiedIssues}</div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Students Tracked</div>
              <div style={{ color: '#38bdf8', fontWeight: 600 }}>{data.students.length}</div>
            </div>
          </div>

          {/* Per-student cards */}
          {data.students.length === 0 ? (
            <div className={styles.infoBox}>
              <p>No student assignments found. Run a sync and ensure JIRA assignees have their JIRA Account ID configured in their profile.</p>
            </div>
          ) : (
            data.students
              .slice()
              .sort((a, b) => b.individualRatio - a.individualRatio)
              .map((student) => (
                <StudentCard key={student.studentId} student={student} />
              ))
          )}
        </>
      )}
    </div>
  );
}

export default AdvisorSprintPanel;
