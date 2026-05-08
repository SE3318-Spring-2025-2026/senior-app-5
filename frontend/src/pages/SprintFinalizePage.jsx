import { useEffect, useMemo, useState } from 'react';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import styles from './DocumentsPage.module.css';

function SprintFinalizePage() {
  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [bootstrapError, setBootstrapError] = useState('');

  const [teamId, setTeamId] = useState('');
  const [sprintId, setSprintId] = useState('');

  const [result, setResult] = useState(null);
  const [status, setStatus] = useState({ loading: false, error: '' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [teamsRes, groupsRes, sprintsRes] = await Promise.all([
          apiClient.get(apiConfig.endpoints.teamsList),
          apiClient.get(apiConfig.endpoints.groups, { params: { page: 1, limit: 100 } }),
          apiClient.get(apiConfig.endpoints.sprints, { params: { page: 1, limit: 100 } }),
        ]);
        if (cancelled) return;
        setTeams(teamsRes.data ?? []);
        setGroups(groupsRes.data?.data ?? groupsRes.data ?? []);
        setSprints(sprintsRes.data?.data ?? sprintsRes.data ?? []);
      } catch (err) {
        if (cancelled) return;
        setBootstrapError(
          err?.response?.data?.message || 'Failed to load teams / groups / sprints.',
        );
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTeam) return;
    if (!selectedTeam.groupId) {
      setStatus({
        loading: false,
        error: 'This team has no Group assigned. Set the Group on the Integrations page first.',
      });
      return;
    }
    setResult(null);
    setStatus({ loading: true, error: '' });
    try {
      const res = await apiClient.post(
        apiConfig.endpoints.teamFinalizeSprintSync(selectedTeam.teamId),
        { sprintId, groupId: selectedTeam.groupId },
      );
      setResult(res.data);
      setStatus({ loading: false, error: '' });
    } catch (err) {
      setStatus({
        loading: false,
        error: err?.response?.data?.message || 'Failed to finalize sprint.',
      });
    }
  };

  const sprintLabel = (s) => {
    const head = s.name || `Sprint ${(s.sprintId || '').slice(0, 8)}`;
    const target = typeof s.targetStoryPoints === 'number' ? ` · ${s.targetStoryPoints} pts` : '';
    return `${head}${target}`;
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerSection}>
        <h1 className={styles.title}>FINALIZE SPRINT</h1>
        <p className={styles.description}>
          Run the final JIRA/GitHub sync, lock all sprint stories, and persist
          per-student StoryPointRecords for grade calculation.
        </p>
      </div>

      {bootstrapError && <div className={styles.errorBox}>{bootstrapError}</div>}

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '500px', marginBottom: '24px' }}
      >
        <div>
          <label style={labelStyle}>Team *</label>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            required
            style={inputStyle}
          >
            <option value="">— Select a team —</option>
            {teams.map((t) => (
              <option key={t.teamId} value={t.teamId}>
                {t.name}{t.groupId ? '' : '  (no group set)'}
              </option>
            ))}
          </select>
          {selectedTeam && (
            <div style={hintStyle}>
              {groupForTeam
                ? <>Group: <strong style={{ color: '#cbd5e1' }}>{groupForTeam.groupName}</strong></>
                : <span style={{ color: '#f87171' }}>No Group is assigned to this team. Configure it on the Integrations page.</span>}
            </div>
          )}
        </div>

        <div>
          <label style={labelStyle}>Sprint *</label>
          <select
            value={sprintId}
            onChange={(e) => setSprintId(e.target.value)}
            required
            style={inputStyle}
          >
            <option value="">— Select a sprint —</option>
            {sprints.map((s) => (
              <option key={s.sprintId} value={s.sprintId}>
                {sprintLabel(s)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={status.loading || !teamId || !sprintId}
          style={{
            padding: '12px 24px', borderRadius: '6px', background: '#dc2626',
            color: '#fff', fontWeight: 700, border: 'none',
            cursor: status.loading ? 'not-allowed' : 'pointer',
            opacity: status.loading || !teamId || !sprintId ? 0.6 : 1,
          }}
        >
          {status.loading ? 'Finalizing…' : 'Finalize Sprint (irreversible)'}
        </button>
      </form>

      {status.error && <div className={styles.errorBox}>{status.error}</div>}

      {result && (
        <div className={styles.tableWrapper}>
          <h3 style={{ color: '#22c55e', marginBottom: '12px' }}>
            ✓ Sprint Finalized · Locked {result.lockedCount} stor{result.lockedCount === 1 ? 'y' : 'ies'}
          </h3>
          <table className={styles.customTable}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Completed Points</th>
                <th>Target Points</th>
                <th>Ratio</th>
              </tr>
            </thead>
            <tbody>
              {result.studentRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>
                    No students with completed issues. Verify JIRA assignees are linked to students.
                  </td>
                </tr>
              ) : (
                result.studentRecords.map((r) => {
                  const ratio = r.targetPoints > 0
                    ? Math.min(1, r.completedPoints / r.targetPoints)
                    : 0;
                  return (
                    <tr key={r.studentId}>
                      <td>{r.studentId}</td>
                      <td>{r.completedPoints}</td>
                      <td>{r.targetPoints}</td>
                      <td style={{ color: ratio >= 0.8 ? '#22c55e' : ratio >= 0.5 ? '#f59e0b' : '#ef4444' }}>
                        {(ratio * 100).toFixed(0)}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  color: '#94a3b8',
  fontSize: '0.85rem',
  display: 'block',
  marginBottom: '4px',
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '6px',
  background: '#1e293b',
  border: '1px solid #334155',
  color: '#f8fafc',
};

const hintStyle = {
  marginTop: 6,
  fontSize: 12,
  color: '#94a3b8',
};

export default SprintFinalizePage;
