import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './DashboardPage.module.css';


import StudentView from '../components/dashboard/StudentView';
import ProfessorView from '../components/dashboard/ProfessorView';
import CoordinatorView from '../components/dashboard/CoordinatorView';

const DashboardPage = () => {
  const navigate = useNavigate();

  
  const userStr = localStorage.getItem('user');
  const token = localStorage.getItem('accessToken');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    
    if (!token || !user) {
      navigate('/login');
    }
  }, [token, user, navigate]);

  
  if (!user) return null;

  
  const renderContent = () => {
    switch (user.role) {
      case 'Student':
        return <StudentView user={user} />;
      case 'Professor':
        return <ProfessorView user={user} />;
      case 'Coordinator':
        return <CoordinatorView user={user} />;
      default:
        return (
          <div className={styles.errorBox}>
            <h2>Access Denied</h2>
            <p>Your role ({user.role}) is not authorized for this view.</p>
          </div>
        );
    }
  };

  return (
    <div className={styles.container}>
      
      <div className={styles.headerSection}>
        <h1 className={styles.title}>{user.role} DASHBOARD</h1>
        <p className={styles.welcomeText}>
          Welcome back, <span className={styles.highlight}>{user.firstName} {user.lastName}</span>
        </p>
      </div>

      
      <div className={styles.contentSection}>
        {renderContent()}
      </div>
    </div>
  );
};

export default DashboardPage;