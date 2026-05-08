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

const EMPTY = { ...FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {}), groupId: '' };

const TeamIntegrationsForm = ({ teamId, groups = [] }) => {
  const [values, setValues] = useState(EMPTY);
  const [status, setStatus] = useState({ saving: false, error: null, info: null });

  const update = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ saving: true, error: null, info: null });
    try {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== ''),
      );
      const res = await apiClient.put(apiConfig.endpoints.teamIntegrations(teamId), payload);
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
        JIRA / GitHub credentials for the team-level sync. The token is encrypted at rest before persistence.
        Set <strong>Board ID</strong> to use the agile board endpoint for active-sprint resolution.
        Set <strong>Group ID</strong> so the daily auto-finalize cron can compute per-student points without manual action.
      </p>

      {status.error && <div style={styles.errorBox}>{status.error}</div>}
      {status.info && <div style={styles.infoBox}>{status.info}</div>}

      <form onSubmit={handleSubmit}>
        {FIELDS.map((f) => (
          <div key={f.key} style={{ marginBottom: 10 }}>
            <label style={styles.label}>
              {f.label}{f.required ? ' *' : ''}
            </label>
            <input
              type={f.type || 'text'}
              value={values[f.key]}
              onChange={update(f.key)}
              placeholder={f.placeholder}
              required={f.required}
              style={styles.input}
              autoComplete="off"
            />
          </div>
        ))}

        <div style={{ marginBottom: 12 }}>
          <label style={styles.label}>Group (cohort)</label>
          <select
            value={values.groupId}
            onChange={update('groupId')}
            style={{ ...styles.input, fontFamily: 'inherit' }}
          >
            <option value="">— Not assigned —</option>
            {groups.map((g) => (
              <option key={g.groupId} value={g.groupId}>
                {g.groupName}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={status.saving} style={styles.primaryBtn}>
          {status.saving ? 'Saving…' : 'Validate & Save'}
        </button>
      </form>
    </div>
  );
};

TeamIntegrationsForm.propTypes = {
  teamId: PropTypes.string.isRequired,
  groups: PropTypes.array,
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
};

export default TeamIntegrationsForm;
