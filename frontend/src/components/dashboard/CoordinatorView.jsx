import React, { useEffect, useState } from 'react';
import styles from '../../pages/DashboardPage.module.css';
import apiClient from '../../utils/apiClient';
import apiConfig from '../../config/api';

const placeholderMetrics = {
  totalStudents: '—',
  activeGroups: '—',
  pendingAdvisorRequests: '—',
  unassignedGroups: '—',
  activityCountLast24h: '—',
  platformHealth: '—',
};

const CoordinatorView = () => {
  const [metrics, setMetrics] = useState(placeholderMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError('');
        const { data } = await apiClient.get(apiConfig.endpoints.dashboardMetrics);
        setMetrics({
          totalStudents: data.totalStudents ?? '—',
          activeGroups: data.activeGroups ?? '—',
          pendingAdvisorRequests: data.pendingAdvisorRequests ?? '—',
          unassignedGroups: data.unassignedGroups ?? '—',
          activityCountLast24h: data.activityCountLast24h ?? '—',
          platformHealth: data.platformHealth ?? '—',
        });
      } catch {
        setError('Unable to load coordinator metrics right now.');
        setMetrics(placeholderMetrics);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const cards = [
    { id: 1, label: 'Total Students', value: metrics.totalStudents },
    { id: 2, label: 'Active Groups', value: metrics.activeGroups },
    { id: 3, label: 'Pending Advisor Requests', value: metrics.pendingAdvisorRequests },
    { id: 4, label: 'Unassigned Groups', value: metrics.unassignedGroups },
    { id: 5, label: 'Activity (24h)', value: metrics.activityCountLast24h },
    { id: 6, label: 'Platform Health', value: metrics.platformHealth },
  ];

  return (
    <div className={styles.roleContainer}>
      <h2 className={styles.sectionTitle}>Global System Metrics</h2>
      {loading && <p>Loading coordinator metrics...</p>}
      {error && <p style={{ color: '#fca5a5' }}>{error}</p>}

      <div className={styles.statsGrid}>
        {cards.map((metric) => (
          <div key={metric.id} className={styles.statCard}>
            <div className={styles.cardTitle}>{metric.label}</div>
            <div className={styles.cardValue}>{metric.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CoordinatorView;