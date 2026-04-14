import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    
    const storedUser = localStorage.getItem('user'); 
    
    if (!storedUser) {
      
      navigate('/login', { replace: true });
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [navigate]);

  if (!user) {
    return <div>Loading dashboard...</div>; 
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Welcome to your Dashboard</h1>
      
      
      <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h3>Profile Information</h3>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.role}</p>
      </div>

      
      <div className="navigation-options">
        <h3>Quick Actions</h3>
        
        {user.role === 'Student' && (
          <div>
            <Link to="/student-dashboard" style={linkStyle}>👉 My Groups / Pending Invites</Link>
          </div>
        )}

        {user.role === 'Professor' && (
          <div>
            <Link to="/professor-dashboard" style={linkStyle}>👉 Manage Groups / View Students</Link>
          </div>
        )}

        {user.role === 'Coordinator' && (
          <div>
            <Link to="/groups" style={linkStyle}>👉 Admin Dashboard</Link>
          </div>
        )}
      </div>
    </div>
  );
};


const linkStyle = {
  display: 'inline-block',
  padding: '10px 15px',
  backgroundColor: '#007bff',
  color: 'white',
  textDecoration: 'none',
  borderRadius: '5px',
  marginTop: '10px'
};

export default DashboardPage;