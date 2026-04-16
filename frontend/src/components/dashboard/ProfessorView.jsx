import React from 'react';
import styles from '../../pages/DashboardPage.module.css';

const ProfessorView = ({ user }) => {
  // Bakkal Hesabı: Yarın Port 3001'den gelecek örnek veriler
  const manageableGroups = [
    { id: 1, name: 'Project Alpha', members: 4, progress: '85%' },
    { id: 2, name: 'Project Beta', members: 5, progress: '40%' },
    { id: 3, name: 'Project Gamma', members: 3, progress: '10%' }
  ];

  return (
    <div className={styles.roleContainer}>
      <h2 className={styles.sectionTitle}>Academic Management Portal</h2>
      
      {/* İstatistik Kartları */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.cardTitle}>Assigned Groups</div>
          <div className={styles.cardValue}>{manageableGroups.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.cardTitle}>Total Supervised Students</div>
          <div className={styles.cardValue}>12</div>
        </div>
      </div>

      {/* Grup Takip Tablosu */}
      <div className={styles.tableWrapper}>
        <h3 style={{ color: '#94a3b8', marginBottom: '15px' }}>Current Group Progress</h3>
        <table className={styles.customTable}>
          <thead>
            <tr>
              <th>Group Name</th>
              <th>Members</th>
              <th>Progress</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {manageableGroups.map((group) => (
              <tr key={group.id}>
                <td>{group.name}</td>
                <td>{group.members}</td>
                <td>
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                    {group.progress}
                  </span>
                </td>
                <td>
                  <button className={styles.smallButton}>Review</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProfessorView;