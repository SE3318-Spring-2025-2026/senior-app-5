import React from 'react';
import styles from './SubmissionChecklist.module.css';

const SubmissionChecklist = () => {
  // mock data for manual test
  const mockRequirements = [
    { id: 'req1', name: 'Project Proposal Document', status: 'Complete' },
    { id: 'req2', name: 'Requirement Specification', status: 'Complete' },
    { id: 'req3', name: 'System Design Architecture', status: 'Pending' },
    { id: 'req4', name: 'Final Presentation Slides', status: 'Pending' },
  ];

  return (
    <div className={styles.checklistContainer}>
      <h3 className={styles.title}>
        📋 Phase Submission Checklist
      </h3>
      
      <ul className={styles.list}>
        {mockRequirements.map((req) => (
          <li key={req.id} className={styles.listItem}>
            <div className={styles.leftSection}>
              <span className={styles.icon}>
                {req.status === 'Complete' ? '✅' : '⏳'}
              </span>
              <span 
                className={`${styles.reqName} ${req.status === 'Complete' ? styles.completedText : ''}`}
              >
                {req.name}
              </span>
            </div>
            
            <span 
              className={`${styles.badge} ${req.status === 'Complete' ? styles.badgeComplete : styles.badgePending}`}
            >
              {req.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SubmissionChecklist;