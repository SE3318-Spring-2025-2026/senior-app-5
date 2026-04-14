import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation(); 

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const user = localStorage.getItem('user');

    
    if (location.pathname === '/login' || location.pathname === '/register') {
      return;
    }

    
    if (!token || !user) {
      console.log("Unauthorized access attempt. Redirecting to login...");
      navigate('/login');
    }
  }, [navigate, location.pathname]); 

  return (
    <div style={styles.container}>
      <Header />

      <div style={styles.mainWrapper}>
        <Sidebar />

        <main style={styles.content}>
          <div style={styles.pageCard}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#020617', 
    overflow: 'hidden', 
  },
  mainWrapper: {
    display: 'flex',
    flex: 1, 
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: '30px',
    overflowY: 'auto', 
    backgroundColor: '#020617',
  },
  pageCard: {
    backgroundColor: '#0f172a', 
    borderRadius: '16px',
    padding: '24px',
    minHeight: '100%',
    border: '1px solid #1e293b',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
    color: '#f8fafc',
  }
};