import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import apiClient from '../utils/apiClient';

const JiraConnect = ({ userId }) => {
  const [accountId, setAccountId] = useState('');
  const [savedAccountId, setSavedAccountId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get(`/auth/users/${userId}/integrations/jira`);
        if (cancelled) return;
        setSavedAccountId(res.data?.jiraAccountId ?? null);
        setAccountId(res.data?.jiraAccountId ?? '');
      } catch (err) {
        if (cancelled) return;
        setError(err?.response?.data?.message || 'Failed to load JIRA account');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSaving(true);
    try {
      const res = await apiClient.put(`/auth/users/${userId}/integrations/jira`, {
        jiraAccountId: accountId.trim(),
      });
      setSavedAccountId(res.data?.jiraAccountId ?? null);
      setInfo(accountId.trim() ? 'JIRA accountId saved.' : 'JIRA accountId unlinked.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save JIRA account');
    } finally {
      setSaving(false);
    }
  };

  const isLinked = !!savedAccountId;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>JIRA</h3>
        <span style={isLinked ? styles.badgeOn : styles.badgeOff}>
          {loading ? 'Checking…' : isLinked ? 'Linked' : 'Not linked'}
        </span>
      </div>

      <p style={styles.description}>
        Provide your <strong>JIRA Cloud accountId</strong> so the platform can match
        issues assigned to you in JIRA with your account here. Find it in your JIRA
        profile URL: <code style={styles.code}>…/jira/people/&lt;accountId&gt;</code>.
      </p>

      {error && <div style={styles.errorBox}>{error}</div>}
      {info && <div style={styles.infoBox}>{info}</div>}

      <form onSubmit={handleSave}>
        <input
          type="text"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          placeholder="e.g. 5b10a2844c20165700ede21g"
          disabled={loading || saving}
          style={styles.input}
        />
        <button type="submit" disabled={loading || saving} style={styles.primaryBtn}>
          {saving ? 'Saving…' : isLinked ? 'Update' : 'Link JIRA Account'}
        </button>
      </form>
    </div>
  );
};

JiraConnect.propTypes = {
  userId: PropTypes.string.isRequired,
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
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { margin: 0, fontSize: 18, fontWeight: 600 },
  badgeOn: {
    backgroundColor: '#064e3b', color: '#34d399',
    padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
  },
  badgeOff: {
    backgroundColor: '#1e293b', color: '#94a3b8',
    padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
  },
  description: { color: '#94a3b8', fontSize: 14, marginBottom: 16 },
  code: { color: '#7dd3fc', fontFamily: 'monospace' },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: 8, marginBottom: 12,
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

export default JiraConnect;
