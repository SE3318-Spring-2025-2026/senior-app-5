import { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import styles from './DocumentsPage.module.css';
import { useNavigate } from 'react-router-dom';

const DocumentsPage = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: '' });

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const userStr = localStorage.getItem('user');
        const localUser = userStr ? JSON.parse(userStr) : null;

        if (!localUser) {
          setStatus({ loading: false, error: 'User session not found. Please log in again.' });
          return;
        }

        let endpoint = '/submissions';
        const userGroupId = localUser.teamId || localUser.groupId;

        if (localUser.role === 'Student') {
          if (!userGroupId) {
            setStatus({ 
              loading: false, 
              error: 'You are not assigned to any group yet. Please contact your coordinator.' 
            });
            return;
          }
          endpoint += `?groupId=${userGroupId}`;
        } else if (localUser.role !== 'Coordinator') {
          setStatus({ loading: false, error: 'Unrecognized user role. Access denied.' });
          return;
        }

        const response = await apiClient.get(endpoint);
        setSubmissions(response.data);
        setStatus({ loading: false, error: '' });

      } catch (error) {
        console.error("Fetch error:", error);
        const details = error.response?.data?.message || 'Failed to load documents from the server.';
        setStatus({ loading: false, error: details });
      }
    };

    fetchSubmissions();
  }, []);

  if (status.loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.loading}>Loading documents...</div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerSection}>
        <h1 className={styles.title}>DOCUMENTS & SUBMISSIONS</h1>
        <p className={styles.description}>View and manage project submissions for your group.</p>
      </div>

      {status.error && (
        <div className={styles.errorBox}>
          <h2>Error Loading Data</h2>
          <p>{status.error}</p>
        </div>
      )}

      {!status.error && submissions.length === 0 ? (
        <div className={styles.infoBox}>
          <p>No submissions found. When you upload a document, it will appear here.</p>
        </div>
      ) : (
        !status.error && (
          <div className={styles.tableWrapper}>
            <table className={styles.customTable}>
              <thead>
                <tr>
                  <th>Document Title</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Submitted Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub._id}>
                    <td className={styles.highlight}>{sub.title}</td>
                    <td>{sub.type ?? '—'}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[sub.status?.toLowerCase().replace(/\s+/g, '')] || ''}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td>
                      {(sub.submittedAt || sub.createdAt)
                        ? new Date(sub.submittedAt || sub.createdAt).toLocaleDateString()
                        : 'No Date'}
                    </td>
                    <td>
                      <button
                        className={styles.smallButton}
                        onClick={() => navigate(`/documents/${sub._id}`)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};

export default DocumentsPage;