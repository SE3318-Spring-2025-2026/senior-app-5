import { useEffect, useState } from 'react';
import authService from '../utils/authService';
import GithubConnect from '../components/GithubConnect';

const IntegrationsPage = () => {
  const [userId, setUserId] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await authService.getCurrentUser();
        if (cancelled) return;
        setUserId(me?.id || me?._id || null);
      } catch (err) {
        if (cancelled) return;
        const msg = err?.response?.data?.message || err?.message || 'Failed to load user';
        setLoadError(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h1 style={styles.title}>Integrations</h1>
        <p style={styles.subtitle}>
          Connect external services to your account.
        </p>
      </div>

      {loadError && <div style={styles.errorBox}>{loadError}</div>}

      <div style={styles.grid}>
        {userId ? (
          <GithubConnect userId={userId} />
        ) : (
          !loadError && <div style={styles.skeleton}>Loading…</div>
        )}
      </div>
    </div>
  );
};

const styles = {
  wrapper: { color: '#e2e8f0' },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 700, margin: 0, color: '#f8fafc' },
  subtitle: { color: '#94a3b8', marginTop: 6, fontSize: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'minmax(0, 480px)', gap: 16 },
  skeleton: {
    border: '1px solid #1e293b',
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#0f172a',
    color: '#94a3b8',
  },
  errorBox: {
    backgroundColor: '#450a0a',
    color: '#fca5a5',
    border: '1px solid #7f1d1d',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
};

export default IntegrationsPage;
