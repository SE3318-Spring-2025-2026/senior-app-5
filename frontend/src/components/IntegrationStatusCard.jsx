import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';

const Badge = ({ ok, label, hint }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '4px 10px', borderRadius: 999,
    background: ok ? '#064e3b' : '#450a0a',
    color: ok ? '#34d399' : '#fca5a5',
    fontSize: 12, fontWeight: 600,
  }} title={hint || ''}>
    <span>{ok ? '✓' : '✗'}</span>
    <span>{label}</span>
  </div>
);

Badge.propTypes = {
  ok: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
  hint: PropTypes.string,
};

const Row = ({ label, value, mono }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e293b' }}>
    <span style={{ color: '#94a3b8', fontSize: 12 }}>{label}</span>
    <span style={{
      color: value ? '#e2e8f0' : '#475569',
      fontSize: 13,
      fontFamily: mono ? 'monospace' : 'inherit',
      maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }}>
      {value || '—'}
    </span>
  </div>
);

Row.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
  mono: PropTypes.bool,
};

const IntegrationStatusCard = ({ teamId }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(apiConfig.endpoints.teamIntegrationsStatus(teamId));
      setStatus(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load status.');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => { refresh(); }, [refresh]);

  if (!status && loading) {
    return <div style={styles.container}><span style={styles.dim}>Checking integrations…</span></div>;
  }
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errBox}>{error}</div>
        <button onClick={refresh} style={styles.btn}>Retry</button>
      </div>
    );
  }
  if (!status) return null;

  const j = status.jira;
  const g = status.github;
  const ls = status.lastSync;

  const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={styles.title}>Connection Status</h3>
        <button onClick={refresh} disabled={loading} style={styles.btn}>
          {loading ? 'Checking…' : 'Re-check'}
        </button>
      </div>

      {/* Top-line badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        <Badge ok={!!j.checks.auth?.ok} label="JIRA Auth"
          hint={j.checks.auth?.message || `status ${j.checks.auth?.status ?? '—'}`} />
        <Badge ok={!!j.checks.project?.ok} label={`Project ${j.projectKey || ''}`}
          hint={j.checks.project?.message || `status ${j.checks.project?.status ?? '—'}`} />
        {j.boardId && (
          <Badge ok={!!j.checks.board?.ok} label={`Board ${j.boardId}`}
            hint={j.checks.board?.message || `status ${j.checks.board?.status ?? '—'}`} />
        )}
        <Badge ok={!!j.checks.activeSprint?.ok} label="Active Sprint"
          hint={j.checks.activeSprint?.ok ? j.checks.activeSprint.name : 'No active sprint'} />
        <Badge ok={!!g.checks.repo?.ok} label="GitHub Repo"
          hint={g.checks.repo?.message || `status ${g.checks.repo?.status ?? '—'}`} />
      </div>

      {/* Identity / config block */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Team</div>
        <Row label="Team ID" value={status.teamId} mono />
        <Row label="Group" value={status.groupId} mono />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>JIRA</div>
        <Row label="Domain" value={j.domain} mono />
        <Row label="Email" value={j.email} mono />
        <Row label="Project Key" value={j.projectKey} mono />
        <Row label="Board ID" value={j.boardId} mono />
        <Row label="Story Points Field" value={j.storyPointsField} mono />
        <Row label="API Token" value={j.hasToken ? 'set ✓ (encrypted)' : 'missing'} />
        {j.checks.activeSprint?.ok && (
          <>
            <Row label="Active Sprint" value={`${j.checks.activeSprint.name} (id ${j.checks.activeSprint.sprintId})`} />
            <Row label="Sprint Window" value={`${fmt(j.checks.activeSprint.startDate)} → ${fmt(j.checks.activeSprint.endDate)}`} />
          </>
        )}
        {!j.checks.auth?.ok && j.configured && (
          <div style={styles.warnBox}>
            JIRA auth failed{j.checks.auth?.status ? ` (HTTP ${j.checks.auth.status})` : ''}.
            {j.checks.auth?.message ? ` ${j.checks.auth.message}` : ''}
          </div>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>GitHub</div>
        <Row label="Repository" value={g.repository} mono />
        <Row label="Visibility" value={g.checks.repo?.private === null ? null : (g.checks.repo.private ? 'private' : 'public')} />
        <Row label="PAT" value={g.hasToken ? 'set ✓ (encrypted)' : 'not set'} />
        {!g.checks.repo?.ok && g.configured && (
          <div style={styles.warnBox}>
            GitHub repo unreachable{g.checks.repo?.status ? ` (HTTP ${g.checks.repo.status})` : ''}.
            {g.checks.repo?.message ? ` ${g.checks.repo.message}` : ''}
          </div>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Last Sync</div>
        <Row label="Synced At" value={fmt(ls.syncedAt)} />
        <Row label="Total Issues" value={ls.totalIssues} />
        <Row label="Verified" value={ls.verifiedIssues} />
        <Row label="Locked" value={ls.lockedIssues} />
      </div>
    </div>
  );
};

IntegrationStatusCard.propTypes = {
  teamId: PropTypes.string.isRequired,
};

const styles = {
  container: {
    border: '1px solid #1e293b', borderRadius: 12,
    padding: 20, background: '#0f172a', color: '#e2e8f0',
    marginTop: 16,
  },
  title: { margin: 0, fontSize: 16, fontWeight: 600 },
  section: { marginTop: 14 },
  sectionTitle: {
    fontSize: 11, color: '#64748b', textTransform: 'uppercase',
    letterSpacing: 0.6, marginBottom: 4, fontWeight: 700,
  },
  dim: { color: '#94a3b8', fontSize: 13 },
  btn: {
    padding: '6px 12px', borderRadius: 6,
    background: '#1e293b', border: '1px solid #334155',
    color: '#e2e8f0', fontSize: 12, fontWeight: 600,
    cursor: 'pointer',
  },
  warnBox: {
    marginTop: 8, padding: 10, borderRadius: 8,
    background: '#450a0a', border: '1px solid #7f1d1d',
    color: '#fca5a5', fontSize: 12, lineHeight: 1.5,
  },
  errBox: {
    padding: 10, borderRadius: 8,
    background: '#450a0a', border: '1px solid #7f1d1d',
    color: '#fca5a5', fontSize: 13, marginBottom: 12,
  },
};

export default IntegrationStatusCard;
