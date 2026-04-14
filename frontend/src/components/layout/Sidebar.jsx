import { NavLink } from 'react-router-dom';

export const Sidebar = () => {
  
  const userStr = localStorage.getItem('user');
  
  const user = userStr ? JSON.parse(userStr) : { role: 'STUDENT' };
  const role = user.role;

  return (
    <aside style={styles.sidebar}>
      <nav style={styles.nav}>
        
        
        <NavLink 
          to="/dashboard" 
          style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.activeLink : {}) })}
        >
          📊 <span style={styles.linkText}>Dashboard</span>
        </NavLink>

        
        {role === 'STUDENT' && (
          <>
            <div style={styles.sectionHeader}>Öğrenci Menüsü</div>
            <NavLink 
              to="/groups" 
              style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.activeLink : {}) })}
            >
              👥 <span style={styles.linkText}>Grubum</span>
            </NavLink>
            <NavLink 
              to="/documents" 
              style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.activeLink : {}) })}
            >
              📄 <span style={styles.linkText}>Belgelerim</span>
            </NavLink>
          </>
        )}

        
        {role === 'COORDINATOR' && (
          <>
            <div style={styles.sectionHeader}>Yönetici Menüsü</div>
            <NavLink 
              to="/all-groups" 
              style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.activeLink : {}) })}
            >
              🏢 <span style={styles.linkText}>Tüm Gruplar</span>
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  );
};


const styles = {
  sidebar: {
    width: '260px',
    backgroundColor: '#030712', 
    color: '#e2e8f0',
    height: 'calc(100vh - 60px)', 
    padding: '20px 0',
    borderRight: '1px solid #1f2937', 
    fontFamily: '"Inter", sans-serif',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px', 
    padding: '0 15px',
  },
  link: {
    textDecoration: 'none',
    color: '#94a3b8', 
    padding: '12px 18px',
    display: 'flex',
    alignItems: 'center',
    fontSize: '15px',
    fontWeight: '500',
    borderRadius: '10px',
    transition: 'all 0.3s ease', 
  },
  linkText: {
    marginLeft: '12px',
  },
  sectionHeader: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#64748b',
    padding: '20px 18px 5px',
    fontWeight: 'bold',
  },
  
  activeLink: {
    backgroundColor: '#1e293b', 
    color: '#38bdf8', 
    fontWeight: 'bold',
    boxShadow: 'inset 0 0 10px rgba(56, 189, 248, 0.1)', 
  }
};