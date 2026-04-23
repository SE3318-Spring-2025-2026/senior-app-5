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

        const groupId = localUser.teamId || localUser.groupId;
        if (!groupId) {
          setError('You are not assigned to any group yet.');
          setLoading(false);
          return;
        }

        const subRes = await apiClient.get(`/submissions?groupId=${groupId}`, { signal });
        const submissions = subRes.data;

        if (!submissions || submissions.length === 0) {
           setError('No active submissions found to track.');
           setLoading(false);
           return;
        }

        const latestSubmissionId = submissions[0]._id;
        const completenessRes = await apiClient.get(`/submissions/${latestSubmissionId}/completeness`, { signal });
        
        const required = completenessRes.data.requiredFields || [];
        const missing = completenessRes.data.missingFields || [];
        
        const mappedRequirements = required.map((field) => ({
          name: field.charAt(0).toUpperCase() + field.slice(1),
          isComplete: !missing.includes(field) 
        }));

        setRequirements(mappedRequirements);
        setLoading(false);

      } catch (err) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        console.error("Failed to fetch completeness:", err);
        setError('Failed to load checklist data from the server.');
        setLoading(false);
      }
    };
    
    fetchCompleteness();
    return () => controller.abort();
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
            const statusText = req.isComplete ? 'COMPLETE' : 'PENDING';
            return (
              <li key={req.name} className={styles.listItem}>
                <div className={styles.leftSection}>
                  <span className={styles.icon}>{req.isComplete ? '✅' : '⏳'}</span>
                  <span className={`${styles.reqName} ${req.isComplete ? styles.completedText : ''}`}>
                    {req.name}
                  </span>
                </div>
                <span className={`${styles.badge} ${req.isComplete ? styles.badgeComplete : styles.badgePending}`}>
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