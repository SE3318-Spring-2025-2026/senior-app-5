import { useState } from 'react';
import PropTypes from 'prop-types';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';

const FIELDS = [
  { key: 'jiraDomain', label: 'JIRA Domain', placeholder: 'mycompany.atlassian.net', required: true },
  { key: 'jiraEmail', label: 'JIRA Email', placeholder: 'leader@mycompany.com', required: true, type: 'email' },
  { key: 'jiraApiToken', label: 'JIRA API Token', placeholder: 'ATATT3xFfGF0...', required: true, type: 'password' },
  { key: 'jiraProjectKey', label: 'JIRA Project Key', placeholder: 'SCRUM', required: true },
  { key: 'jiraBoardId', label: 'JIRA Board ID', placeholder: '42 (numeric, optional)', required: false },
  { key: 'jiraStoryPointsField', label: 'Story Points Custom Field', placeholder: 'customfield_10016 (Jira default)', required: false },
  { key: 'githubRepositoryId', label: 'GitHub Repository (owner/repo)', placeholder: 'my-org/my-repo', required: true },
  { key: 'githubToken', label: 'GitHub PAT', placeholder: 'ghp_xxxxxxxxxxxx', required: false, type: 'password' },
];

const EMPTY = FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {});

const TeamIntegrationsForm = ({ team }) => {
  const [values, setValues] = useState(EMPTY);
  const [status, setStatus] = useState({ saving: false, error: null, info: null });
  const [discovery, setDiscovery] = useState({
    busy: false,
    error: null,
    info: null,
    boards: null,        // null = not yet run; [] = ran but empty
    projects: null,
  });

  const groupName = team?.groupName || null;

  const update = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const handleDiscover = async () => {
    if (!values.jiraDomain || !values.jiraEmail || !values.jiraApiToken) {
      setDiscovery((d) => ({ ...d, error: 'Fill JIRA Domain, Email and API Token first.' }));
      return;
    }
    setDiscovery({ busy: true, error: null, info: null, boards: null, projects: null });
    try {
      const res = await apiClient.post(apiConfig.endpoints.teamJiraDiscover, {
        jiraDomain: values.jiraDomain,
        jiraEmail: values.jiraEmail,
        jiraApiToken: values.jiraApiToken,
        jiraProjectKey: values.jiraProjectKey || undefined,
      });
      const d = res.data || {};
      const next = { ...values };
      let info = [];

      if (d.storyPointsFieldId && !next.jiraStoryPointsField) {
        next.jiraStoryPointsField = d.storyPointsFieldId;
        info.push(`story points field → ${d.storyPointsFieldId}`);
      }

      const boards = Array.isArray(d.boards) ? d.boards : [];
      if (boards.length === 1 && !next.jiraBoardId) {
        next.jiraBoardId = boards[0].id;
        info.push(`board → ${boards[0].name} (id ${boards[0].id})`);
      }

      // Auto-pick project key when there's only one and the user hasn't chosen
      const projects = Array.isArray(d.projects) ? d.projects : [];
      if (!next.jiraProjectKey && projects.length === 1) {
        next.jiraProjectKey = projects[0].key;
        info.push(`project → ${projects[0].name} (${projects[0].key})`);
      }

      setValues(next);
      setDiscovery({
        busy: false,
        error: null,
        info: info.length ? `Auto-filled: ${info.join(', ')}.` : 'Connection OK.',
        boards,
        projects,
      });
    } catch (err) {
      setDiscovery({
        busy: false,
        error: err?.response?.data?.message || 'Discover failed. Check credentials.',
        info: null,
        boards: null,
        projects: null,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ saving: true, error: null, info: null });
    try {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== ''),
      );
      const res = await apiClient.put(
        apiConfig.endpoints.teamIntegrations(team.teamId),
        payload,
      );
      setStatus({ saving: false, error: null, info: res.data?.message || 'Saved.' });
    } catch (err) {
      setStatus({
        saving: false,
        error: err?.response?.data?.message || 'Failed to save team integrations.',
        info: null,
      });
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Team Integrations</h3>
      <p style={styles.description}>
        JIRA / GitHub credentials for your team. Tokens are encrypted at rest before persistence.
      </p>

      {/* Group readonly chip — leader cannot change this */}
      <div style={styles.groupChip}>
        <span style={styles.groupLabel}>Group</span>
        {groupName ? (
          <span style={styles.groupValue}>{groupName}</span>
        ) : team?.groupId ? (
          <span style={styles.groupValueDim}>{team.groupId}</span>
        ) : (
          <span style={styles.groupMissing}>
            Not linked yet — contact admin to attach this team to a group.
          </span>
        )}
      </div>

      {status.error && <div style={styles.errorBox}>{status.error}</div>}
      {status.info && <div style={styles.infoBox}>{status.info}</div>}

      <form onSubmit={handleSubmit}>
        {/* Step 1 — credentials needed for the discover call */}
        {['jiraDomain', 'jiraEmail', 'jiraApiToken', 'jiraProjectKey'].map((key) => {
          const f = FIELDS.find((x) => x.key === key);
          return (
            <div key={key} style={{ marginBottom: 10 }}>
              <label style={styles.label}>{f.label}{f.required ? ' *' : ''}</label>
              <input
                type={f.type || 'text'}
                value={values[key]}
                onChange={update(key)}
                placeholder={f.placeholder}
                required={f.required}
                style={styles.input}
                autoComplete="off"
              />
            </div>
          );
        })}

        <button
          type="button"
          onClick={handleDiscover}
          disabled={discovery.busy}
          style={styles.discoverBtn}
        >
          {discovery.busy ? 'Discovering…' : 'Discover from JIRA (auto-fill board + field)'}
        </button>
        {discovery.error && <div style={{ ...styles.errorBox, marginTop: 8 }}>{discovery.error}</div>}
        {discovery.info && <div style={{ ...styles.infoBox, marginTop: 8 }}>{discovery.info}</div>}

        {/* Board: dropdown when discovery returned options, plain input otherwise */}
        <div style={{ marginBottom: 10, marginTop: 12 }}>
          <label style={styles.label}>JIRA Board</label>
          {Array.isArray(discovery.boards) && discovery.boards.length > 0 ? (
            <select
              value={values.jiraBoardId}
              onChange={update('jiraBoardId')}
              style={{ ...styles.input, fontFamily: 'inherit' }}
            >
              <option value="">— Select a board —</option>
              {discovery.boards.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.type}, id {b.id})</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={values.jiraBoardId}
              onChange={update('jiraBoardId')}
              placeholder="42 (or click Discover above)"
              style={styles.input}
              autoComplete="off"
            />
          )}
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={styles.label}>Story Points Custom Field</label>
          <input
            type="text"
            value={values.jiraStoryPointsField}
            onChange={update('jiraStoryPointsField')}
            placeholder="customfield_10016 (or click Discover above)"
            style={styles.input}
            autoComplete="off"
          />
        </div>

        {/* GitHub block */}
        <div style={{ height: 1, background: '#1e293b', margin: '16px 0' }} />

        {['githubRepositoryId', 'githubToken'].map((key) => {
          const f = FIELDS.find((x) => x.key === key);
          return (
            <div key={key} style={{ marginBottom: 10 }}>
              <label style={styles.label}>{f.label}{f.required ? ' *' : ''}</label>
              <input
                type={f.type || 'text'}
                value={values[key]}
                onChange={update(key)}
                placeholder={f.placeholder}
                required={f.required}
                style={styles.input}
                autoComplete="off"
              />
            </div>
          );
        })}

        <button type="submit" disabled={status.saving} style={styles.primaryBtn}>
          {status.saving ? 'Saving…' : 'Validate & Save'}
        </button>
      </form>
    </div>
  );
};

TeamIntegrationsForm.propTypes = {
  team: PropTypes.shape({
    teamId: PropTypes.string.isRequired,
    name: PropTypes.string,
    groupId: PropTypes.string,
    groupName: PropTypes.string,
  }).isRequired,
};

const styles = {
  container: {
    border: '1px solid #1e293b',
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    marginTop: 16,
  },
  title: { margin: 0, fontSize: 18, fontWeight: 600, marginBottom: 8 },
  description: { color: '#94a3b8', fontSize: 13, marginBottom: 16, lineHeight: 1.5 },
  groupChip: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px', borderRadius: 8,
    background: '#0b1220', border: '1px solid #1e293b',
    marginBottom: 16,
  },
  groupLabel: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 },
  groupValue: { fontSize: 14, color: '#e2e8f0', fontWeight: 600 },
  groupValueDim: { fontSize: 13, color: '#cbd5e1', fontFamily: 'monospace' },
  groupMissing: { fontSize: 13, color: '#fca5a5' },
  label: { color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 4 },
  input: {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    background: '#0b1220', border: '1px solid #1e293b', color: '#f8fafc', fontSize: 14,
    fontFamily: 'monospace',
  },
  errorBox: {
    backgroundColor: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d',
    padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12,
  },
  infoBox: {
    backgroundColor: '#0c4a6e', color: '#bae6fd', border: '1px solid #075985',
    padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12,
  },
  primaryBtn: {
    width: '100%', padding: '10px 16px', backgroundColor: '#111827',
    color: '#f8fafc', border: '1px solid #374151', borderRadius: 8,
    fontWeight: 600, cursor: 'pointer',
  },
  discoverBtn: {
    width: '100%', padding: '9px 16px', backgroundColor: '#1d4ed8',
    color: '#f8fafc', border: '1px solid #1e40af', borderRadius: 8,
    fontWeight: 600, cursor: 'pointer', marginTop: 4,
  },
};

export default TeamIntegrationsForm;
