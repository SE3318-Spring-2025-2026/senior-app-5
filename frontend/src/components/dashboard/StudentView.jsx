import styles from '../../pages/DashboardPage.module.css'; 
import SubmissionChecklist from '../SubmissionChecklist';

const StudentView = ({ user }) => {
  return (
    <div className={styles.roleContainer}> 
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.cardTitle}>My Groups</div>
          <div className={styles.cardValue}>1 Active</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.cardTitle}>Pending Invites</div>
          <div className={styles.cardValue}>3 New</div>
        </div>
      </div>


      <SubmissionChecklist />
      
    </div>
  );
};

export default StudentView;