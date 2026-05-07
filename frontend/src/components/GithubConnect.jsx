import { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import authService from '../utils/authService';

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
const GITHUB_OAUTH_SCOPES =
  import.meta.env.VITE_GITHUB_OAUTH_SCOPES || 'read:user read:project repo';
const STATE_STORAGE_KEY = 'github_oauth_state';

function generateState() {
  const random = crypto.getRandomValues(new Uint32Array(2));
  return `${Date.now()}-${random[0]}-${random[1]}`;
}

const GithubConnect = ({ userId }) => {
  const [isLinked, setIsLinked] = useState(false);
  const [scopes, setScopes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const refreshStatus = useCallback(async () => {
    if (!userId) return;
    try {
      const status = await authService.getGithubStatus(userId);
      setIsLinked(!!status.isGithubConnected);
      setScopes(status.scopes || null);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load GitHub status';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (!userId) return;

    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');
    const oauthError = url.searchParams.get('error');

    if (oauthError) {
      setError(`GitHub authorization failed: ${oauthError}`);
      window.history.replaceState({}, document.title, url.pathname);
      return;
    }

    if (!code) return;

    const expectedState = sessionStorage.getItem(STATE_STORAGE_KEY);
    sessionStorage.removeItem(STATE_STORAGE_KEY);
    window.history.replaceState({}, document.title, url.pathname);

    if (!expectedState || expectedState !== returnedState) {
      setError('GitHub OAuth state mismatch. Please try connecting again.');
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await authService.linkGithub(userId, code);
        setIsLinked(!!result.isGithubConnected);
        setScopes(result.scopes || null);
        setInfo('GitHub account linked successfully.');
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message || 'Failed to link GitHub account';
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const handleConnect = () => {
    setError(null);
    setInfo(null);

    if (!GITHUB_CLIENT_ID) {
      setError('VITE_GITHUB_CLIENT_ID is not configured.');
      return;
    }

    const state = generateState();
    sessionStorage.setItem(STATE_STORAGE_KEY, state);

    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: GITHUB_OAUTH_SCOPES,
      state,
    });

    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
  };

  const handleDisconnect = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const result = await authService.unlinkGithub(userId);
      setIsLinked(!!result.isGithubConnected);
      setScopes(null);
      setInfo('GitHub account unlinked.');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to unlink GitHub account';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>GitHub</h3>
        <span style={isLinked ? styles.badgeOn : styles.badgeOff}>
          {loading ? 'Checking…' : isLinked ? 'Connected' : 'Not connected'}
        </span>
      </div>

      <p style={styles.description}>
        Link your GitHub account so the platform can read story points and issue completion
        from the project linked to your repository.
      </p>

      {isLinked && scopes && (
        <div style={styles.scopeBox}>
          <span style={styles.scopeLabel}>Granted scopes:</span>{' '}
          <code style={styles.scopeCode}>{scopes}</code>
        </div>
      )}

      {error && <div style={styles.errorBox}>{error}</div>}
      {info && <div style={styles.infoBox}>{info}</div>}

      {isLinked ? (
        <button type="button" onClick={handleDisconnect} disabled={loading} style={styles.dangerBtn}>
          {loading ? 'Working…' : 'Disconnect GitHub'}
        </button>
      ) : (
        <button type="button" onClick={handleConnect} disabled={loading} style={styles.primaryBtn}>
          {loading ? 'Working…' : 'Connect GitHub Account'}
        </button>
      )}
    </div>
  );
};

GithubConnect.propTypes = {
  userId: PropTypes.string.isRequired,
};

const styles = {
  container: {
    border: '1px solid #1e293b',
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { margin: 0, fontSize: 18, fontWeight: 600 },
  badgeOn: {
    backgroundColor: '#064e3b',
    color: '#34d399',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
  },
  badgeOff: {
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
  },
  description: { color: '#94a3b8', fontSize: 14, marginBottom: 16 },
  scopeBox: {
    backgroundColor: '#0b1220',
    border: '1px solid #1e293b',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: '#cbd5e1',
    marginBottom: 12,
  },
  scopeLabel: { color: '#94a3b8' },
  scopeCode: { color: '#7dd3fc', wordBreak: 'break-all' },
  errorBox: {
    backgroundColor: '#450a0a',
    color: '#fca5a5',
    border: '1px solid #7f1d1d',
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: '#0c4a6e',
    color: '#bae6fd',
    border: '1px solid #075985',
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 12,
  },
  primaryBtn: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: '#111827',
    color: '#f8fafc',
    border: '1px solid #374151',
    borderRadius: 8,
    fontWeight: 600,
    cursor: 'pointer',
  },
  dangerBtn: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: '#7f1d1d',
    color: '#fff',
    border: '1px solid #991b1b',
    borderRadius: 8,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default GithubConnect;
