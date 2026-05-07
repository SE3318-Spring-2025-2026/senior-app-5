import { useEffect, useState } from 'react';
import styles from '../../pages/DashboardPage.module.css';
import StoryPointsPanel from './StoryPointsPanel';
import apiClient from '../../utils/apiClient';

const CoordinatorView = () => {
  const [metrics, setMetrics] = useState({
    committees: '…',
    advisors: '…',
    pendingRequests: '…',
  });

  useEffect(() => {
    const load = async () => {
      const [committeesRes, advisorsRes, requestsRes] = await Promise.allSettled([
        apiClient.get('/committees', { params: { limit: 1 } }),
        apiClient.get('/advisors', { params: { limit: 1 } }),
        apiClient.get('/requests', { params: { status: 'PENDING', limit: 1 } }),
      ]);

      setMetrics({
        committees:
          committeesRes.status === 'fulfilled'
            ? String(committeesRes.value.data?.total ?? committeesRes.value.data?.length ?? '—')
            : '—',
        advisors:
          advisorsRes.status === 'fulfilled'
            ? String(advisorsRes.value.data?.total ?? advisorsRes.value.data?.length ?? '—')
            : '—',
        pendingRequests:
          requestsRes.status === 'fulfilled'
            ? String(requestsRes.value.data?.total ?? requestsRes.value.data?.data?.length ?? '—')
            : '—',
      });
    };
    load();
  }, []);

  const metricCards = [
    { label: 'Committees', value: metrics.committees, color: '#38bdf8' },
    { label: 'Advisors', value: metrics.advisors, color: '#10b981' },
    { label: 'Pending Advisor Requests', value: metrics.pendingRequests, color: '#fbbf24' },
  ];

  return (
    <div className={styles.roleContainer}>
      <h2 className={styles.sectionTitle}>Global System Metrics</h2>

      <div className={styles.statsGrid}>
        {metricCards.map((m) => (
          <div key={m.label} className={styles.statCard}>
            <div className={styles.cardTitle}>{m.label}</div>
            <div className={styles.cardValue} style={{ color: m.color }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.infoBox}>
        <h3>Administrative Quick Actions</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '10px 0' }}>
          As a <strong style={{ color: '#f1f5f9' }}>Coordinator</strong>, you have overarching authority. You can manage system-wide audit logs,
          adjust global configurations, and oversee all academic departments.
        </p>
      </div>
      <StoryPointsPanel canOverride />
    </div>
  );
};

export default CoordinatorView;
