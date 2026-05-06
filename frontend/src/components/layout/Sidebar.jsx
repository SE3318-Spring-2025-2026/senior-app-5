import { NavLink, useLocation } from 'react-router-dom';

export const Sidebar = () => {
  const location = useLocation();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : { role: 'Student' };
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

        <NavLink
          to="/integrations"
          style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.activeLink : {}) })}
        >
          🔗 <span style={styles.linkText}>Integrations</span>
        </NavLink>

        
        {(role === 'Student' || role === 'TeamLeader') && (
          <>
            <div style={styles.sectionHeader}>STUDENT MENU</div>
            <NavLink 
              to="/groups" 
              style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.activeLink : {}) })}
            >
              👥 <span style={styles.linkText}>My Group</span>
            </NavLink>
            <NavLink 
              to="/documents" 
              style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.activeLink : {}) })}
            >
              📄 <span style={styles.linkText}>My Documents</span>
            </NavLink>
          </>
        )}

        {role === 'Professor' && (
          <>
            <div style={styles.sectionHeader}>PROFESSOR MENU</div>
            <NavLink
              to="/review"
              style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.activeLink : {}) })}
            >
              <span>Review</span>
            </NavLink>
          </>
        )}

        
        {role === 'Coordinator' && (
          <>
            <div style={styles.sectionHeader}>COORDINATOR MENU</div>
            <NavLink
              to="/coordinator-management"
              style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.activeLink : {}) })}
            >
              🗂️ <span style={styles.linkText}>Coordinator Suite</span>
            </NavLink>
            <NavLink
              to="/phases/schedule"
              style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.activeLink : {}) })}
            >
              🗓️ <span style={styles.linkText}>Phase Scheduling</span>
            </NavLink>
            <NavLink
              to="/admin"
              style={{
                ...styles.link,
                ...(location.pathname.startsWith('/admin') ? styles.activeLink : {})
              }}
            >
              🛠️ <span style={styles.linkText}>Admin Panel</span>
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
    height: 'calc(100vh - 65px)', 
    padding: '20px 0',
    borderRight: '1px solid #1e293b',
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
    padding: '25px 18px 8px',
    fontWeight: 'bold',
  },
  
  activeLink: {
    backgroundColor: '#1e293b', 
    color: '#38bdf8', 
    fontWeight: 'bold',
    boxShadow: 'inset 0 0 10px rgba(56, 189, 248, 0.1)',
    borderLeft: '4px solid #38bdf8', 
  }
};
