import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './DashboardPage.module.css'; 

const DashboardPage = () => {
  const navigate = useNavigate();

  
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    
    const token = localStorage.getItem('token');
    
    
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>System Overview</h1>
      <p className={styles.welcomeText}>
        Welcome back, <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>{user?.firstName || 'User'}</span>. 
        Everything looks good in your project environment.
      </p>

      
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.cardTitle}>Active Projects</div>
          <div className={styles.cardValue}>4</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.cardTitle}>Group Status</div>
          <div className={styles.cardValue}>In Progress</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.cardTitle}>Pending Reports</div>
          <div className={styles.cardValue}>2</div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;