import { useNavigate } from 'react-router-dom';

export const Header = () => {
  const navigate = useNavigate();

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : { firstName: 'USER' };

  const handleLogout = () => {
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user'); 
    navigate('/login');
  };

  return (
    <header style={styles.header}>
      
      <div style={styles.logoSection}>
        <div style={styles.logoIcon}>S</div>
        <span style={styles.logoText}>SENIOR<span style={styles.logoHighlight}>APP</span></span>
      </div>

      <div style={styles.userActionArea}>
        <div style={styles.userInfo}>
          <span style={styles.welcomeLabel}>WELCOME</span>
          <span style={styles.userName}>{user.firstName || 'User'}</span>
        </div>
        
        <button 
          onClick={handleLogout} 
          style={styles.logoutButton}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          LOGOUT
        </button>
      </div>

    </header>
  );
};

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 30px',
    backgroundColor: '#0f172a', 
    color: 'white',
    height: '65px',
    borderBottom: '1px solid #1e293b',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    width: '35px',
    height: '35px',
    backgroundColor: '#38bdf8', 
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: 'bold',
    fontSize: '20px',
    color: '#030712',
    boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: '800',
    letterSpacing: '2px',
    color: '#f8fafc',
  },
  logoHighlight: {
    color: '#38bdf8',
  },
  userActionArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '25px',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  welcomeLabel: {
    fontSize: '10px',
    color: '#64748b',
    letterSpacing: '1px',
    fontWeight: 'bold',
  },
  userName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#38bdf8',
  },
  logoutButton: {
    padding: '8px 18px',
    backgroundColor: 'transparent',
    color: '#f8fafc',
    border: '2px solid #ef4444', 
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    letterSpacing: '1px',
  }
};