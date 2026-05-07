import { useEffect, useState } from 'react';
import styles from '../../pages/DashboardPage.module.css';
import StoryPointsPanel from './StoryPointsPanel';
import apiClient from '../../utils/apiClient';

const ProfessorView = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/requests', {
          params: { status: 'APPROVED', limit: 100 },
        });
        const data = res.data?.data ?? res.data ?? [];
        setGroups(Array.isArray(data) ? data : []);
      } catch {
        setGroups([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className={styles.roleContainer}>
      <h2 className={styles.sectionTitle}>Academic Management Portal</h2>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.cardTitle}>Assigned Groups</div>
          <div className={styles.cardValue}>{loading ? '…' : groups.length}</div>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <h3 style={{ color: '#94a3b8', marginBottom: '15px' }}>Current Groups</h3>
        {loading ? (
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Loading…</p>
        ) : groups.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No assigned groups.</p>
        ) : (
          <table className={styles.customTable}>
            <thead>
              <tr>
                <th>Group ID</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((req) => (
                <tr key={req.requestId ?? req.groupId}>
                  <td>{req.groupId}</td>
                  <td>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                      {req.status ?? 'APPROVED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <StoryPointsPanel canOverride={false} />
    </div>
  );
};

export default ProfessorView;
