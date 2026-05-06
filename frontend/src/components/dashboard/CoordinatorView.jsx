import React from 'react';
import styles from '../../pages/DashboardPage.module.css';
import StoryPointsPanel from './StoryPointsPanel';

const CoordinatorView = ({ user }) => {
  
  const systemMetrics = [
    { id: 1, label: 'Global Students', value: '254', trend: '+12%', color: '#38bdf8' },
    { id: 2, label: 'Active Projects', value: '42', trend: 'Stable', color: '#10b981' },
    { id: 3, label: 'System Requests', value: '18', trend: 'High', color: '#fbbf24' },
    { id: 4, label: 'Platform Health', value: '99.9%', trend: 'Optimal', color: '#f8fafc' }
  ];

  return (
    <div className={styles.roleContainer}>
      <h2 className={styles.sectionTitle}>Global System Metrics</h2>
      
      
      <div className={styles.statsGrid}>
        {systemMetrics.map((metric) => (
          <div key={metric.id} className={styles.statCard}>
            <div className={styles.cardTitle}>{metric.label}</div>
            <div className={styles.cardValue} style={{ color: metric.color }}>
              {metric.value}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '5px' }}>
              Status: {metric.trend}
            </div>
          </div>
        ))}
      </div>

      
      <div className={styles.infoBox}>
        <h3 style={{ color: '#f8fafc' }}>Administrative Quick Actions</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '10px 0' }}>
          As a **Coordinator**, you have overarching authority. You can manage system-wide audit logs, 
          adjust global configurations, and oversee all academic departments.
        </p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <button className={styles.actionButton}>Download Reports</button>
          <button className={`${styles.actionButton} ${styles.secondaryButton}`}>
            System Logs
          </button>
        </div>
      </div>
      <StoryPointsPanel canOverride />
    </div>
  );
};


const extraStyles = {
  secondaryButton: {
    background: 'transparent',
    border: '1px solid #334155',
    color: '#94a3b8'
  }
};

export default CoordinatorView;