import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import styles from './SubmissionChecklist.module.css';

const SubmissionChecklist = () => {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {

    const controller = new AbortController();
    const { signal } = controller;

    const fetchCompleteness = async () => {
      try {
        const userStr = localStorage.getItem('user');
        const localUser = userStr ? JSON.parse(userStr) : null;

        if (!localUser) {
          setError('User session not found.');
          setLoading(false);
          return;
        }

        // 1. find the group of user
        const groupId = localUser.teamId || localUser.groupId;
        if (!groupId) {
          setError('You are not assigned to any group yet.');
          setLoading(false);
          return;
        }

        // 2. Pull the group's latest submission (signal'i isteğe ekliyoruz)
        const subRes = await apiClient.get(`/submissions?groupId=${groupId}`, { signal });
        const submissions = subRes.data;

        if (!submissions || submissions.length === 0) {
           setError('No active submissions found to track.');
           setLoading(false);
           return;
        }

       // The most current submission from the backend appears at the top (index 0)
        const latestSubmissionId = submissions[0]._id;

        const completenessRes = await apiClient.get(`/submissions/${latestSubmissionId}/completeness`, { signal });
        
        const data = completenessRes.data.requirements || completenessRes.data || [];
        setRequirements(data);
        setLoading(false);

      } catch (err) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') {
          return; 
        }
        
        console.error("Failed to fetch completeness:", err);
        setError('Failed to load checklist data from the server.');
        setLoading(false);
      }
    };

    fetchCompleteness();

    return () => {
      controller.abort();
    };
  }, []);

  if (loading) {
    return (
      <div className={styles.checklistContainer}>
        <h3 className={styles.title}>📋 Phase Submission Checklist</h3>
        <p style={{ color: '#38bdf8', fontWeight: 'bold' }}>Loading requirements...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.checklistContainer}>
        <h3 className={styles.title}>📋 Phase Submission Checklist</h3>
        <p style={{ color: '#94a3b8' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.checklistContainer}>
      <h3 className={styles.title}>📋 Phase Submission Checklist</h3>
      
      {requirements.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No specific requirements found for this phase.</p>
      ) : (
        <ul className={styles.list}>
          {requirements.map((req) => {
            const isComplete = req.status === 'Complete' || req.isMet === true;
            const statusText = isComplete ? 'COMPLETE' : 'PENDING';
            
            const uniqueKey = req.id || req.name || req.requirementName;

            return (
              <li key={uniqueKey} className={styles.listItem}>
                <div className={styles.leftSection}>
                  <span className={styles.icon}>
                    {isComplete ? '✅' : '⏳'}
                  </span>
                  <span 
                    className={`${styles.reqName} ${isComplete ? styles.completedText : ''}`}
                  >
                    {req.name || req.requirementName}
                  </span>
                </div>
                
                <span 
                  className={`${styles.badge} ${isComplete ? styles.badgeComplete : styles.badgePending}`}
                >
                  {statusText}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default SubmissionChecklist;