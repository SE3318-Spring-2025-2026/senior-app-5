import { useEffect, useMemo, useState } from 'react';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import styles from './DocumentsPage.module.css';

function SprintFinalizePage() {
  const [sprints, setSprints] = useState([]);
  const [bootstrapError, setBootstrapError] = useState('');

  const [sprintId, setSprintId] = useState('');

  const [result, setResult] = useState(null);
  const [status, setStatus] = useState({ loading: false, error: '' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sprintsRes = await apiClient.get(apiConfig.endpoints.sprints, {
          params: { page: 1, limit: 100 },
        });
        if (cancelled) return;
        setSprints(sprintsRes.data?.data ?? sprintsRes.data ?? []);
      } catch (err) {
        if (cancelled) return;
        setBootstrapError(
          err?.response?.data?.message || 'Failed to load sprints.',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Sort by start date so option order matches sprint sequence (#1, #2, …).
  // Backend returns createdAt-desc, which doesn't always match chronological
  // sprint order and previously caused operators to pick the wrong sprint.
  const orderedSprints = useMemo(() => {
    const arr = [...sprints];
    arr.sort((a, b) => {
      const ad = a.startDate ? new Date(a.startDate).getTime() : Infinity;
      const bd = b.startDate ? new Date(b.startDate).getTime() : Infinity;
      return ad - bd;
    });
    return arr.map((s, i) => ({ ...s, sprintNumber: i + 1 }));
  }, [sprints]);

  const selectedSprint = useMemo(
    () => orderedSprints.find((s) => s.sprintId === sprintId) || null,
    [orderedSprints, sprintId],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sprintId) return;
    setResult(null);
    setStatus({ loading: true, error: '' });
    try {
      const res = await apiClient.post(
        apiConfig.endpoints.finalizeSprintForAllTeams,
        { sprintId },
      );
      setResult(res.data);
      setStatus({ loading: false, error: '' });
    } catch (err) {
      setStatus({
        loading: false,
        error:
          err?.response?.data?.message ||
          'Failed to finalize sprint for all teams.',
      });
    }
  };

  const sprintLabel = (s) => {
    const num = `#${s.sprintNumber}`;
    const head = s.name || `Sprint`;
    const target =
      typeof s.targetStoryPoints === 'number' ? ` · ${s.targetStoryPoints} pts` : '';
    const mappingCount = Array.isArray(s.deliverableMappings)
      ? s.deliverableMappings.length
      : 0;
    const mappings =
      mappingCount === 0
        ? '  ⚠ NO deliverable mappings'
        : ` · ${mappingCount} mapping${mappingCount === 1 ? '' : 's'}`;
    const finalized = s.isFinalized ? '  (already finalized)' : '';
    return `${num} · ${head}${target}${mappings}${finalized}`;
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerSection}>
        <h1 className={styles.title}>FINALIZE SPRINT</h1>
        <p className={styles.description}>
          Run the final JIRA/GitHub sync, lock all sprint stories, persist
          per-student StoryPointRecords for every JIRA-configured team, and
          recalculate grades for every affected group.
        </p>
      </div>

      {bootstrapError && <div className={styles.errorBox}>{bootstrapError}</div>}

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxWidth: '500px',
          marginBottom: '24px',
        }}
      >
        <div>
          <label style={labelStyle}>Sprint *</label>
          <select
            value={sprintId}
            onChange={(e) => setSprintId(e.target.value)}
            required
            style={inputStyle}
          >
            <option value="">— Select a sprint —</option>
            {orderedSprints.map((s) => {
              const noMappings =
                !Array.isArray(s.deliverableMappings) ||
                s.deliverableMappings.length === 0;
              return (
                <option
                  key={s.sprintId}
                  value={s.sprintId}
                  disabled={s.isFinalized || noMappings}
                >
                  {sprintLabel(s)}
                </option>
              );
            })}
          </select>
          {selectedSprint?.isFinalized && (
            <div style={{ ...hintStyle, color: '#f59e0b' }}>
              This sprint is already finalized.
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={
            status.loading || !sprintId || selectedSprint?.isFinalized
          }
          style={{
            padding: '12px 24px',
            borderRadius: '6px',
            background: '#dc2626',
            color: '#fff',
            fontWeight: 700,
            border: 'none',
            cursor: status.loading ? 'not-allowed' : 'pointer',
            opacity:
              status.loading || !sprintId || selectedSprint?.isFinalized
                ? 0.6
                : 1,
          }}
        >
          {status.loading
            ? 'Finalizing for all teams…'
            : 'Finalize Sprint for All Teams (irreversible)'}
        </button>
      </form>

      {status.error && <div className={styles.errorBox}>{status.error}</div>}

      {result && (
        <div className={styles.tableWrapper}>
          <h3 style={{ color: '#22c55e', marginBottom: '12px' }}>
            ✓ Finalized for {result.teamResults?.filter((t) => t.ok).length ?? 0} of{' '}
            {result.teamResults?.length ?? 0} teams ·{' '}
            Grades recalculated for{' '}
            {result.gradeResults?.filter((g) => g.ok).length ?? 0} groups
          </h3>

          <h4 style={{ color: '#cbd5e1', marginBottom: '8px' }}>Per Team</h4>
          {(result.teamResults ?? []).map((t) => (
            <div
              key={t.teamId}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div style={{ color: '#f8fafc', fontWeight: 600 }}>{t.teamName}</div>
                <div
                  style={{
                    color: t.ok ? '#22c55e' : '#ef4444',
                    fontSize: 12,
                  }}
                >
                  {t.ok
                    ? `${t.lockedCount} stor${t.lockedCount === 1 ? 'y' : 'ies'} locked`
                    : t.error}
                </div>
              </div>
              {t.ok && (t.studentRecords ?? []).length > 0 && (
                <table className={styles.customTable} style={{ marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Completed</th>
                      <th>Target</th>
                      <th>Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.studentRecords.map((s) => {
                      const ratio = s.targetPoints > 0
                        ? Math.min(1, s.completedPoints / s.targetPoints)
                        : 0;
                      const color = ratio >= 0.8 ? '#22c55e' : ratio >= 0.5 ? '#f59e0b' : '#ef4444';
                      return (
                        <tr key={s.studentId}>
                          <td>{s.studentName || s.studentEmail || s.studentId}</td>
                          <td>{s.completedPoints}</td>
                          <td>{s.targetPoints}</td>
                          <td style={{ color }}>{(ratio * 100).toFixed(0)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ))}

          <h4 style={{ color: '#cbd5e1', marginBottom: '8px' }}>Per Group (grades)</h4>
          <table className={styles.customTable}>
            <thead>
              <tr>
                <th>Group</th>
                <th>Team Grade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(result.gradeResults ?? []).map((g) => (
                <tr key={g.groupId}>
                  <td>{g.groupId}</td>
                  <td>{g.ok ? g.teamGrade : '—'}</td>
                  <td
                    style={{
                      color: g.ok ? '#22c55e' : '#ef4444',
                      fontSize: 12,
                    }}
                  >
                    {g.ok ? 'OK' : g.error}
                  </td>
                </tr>
              ))}
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
