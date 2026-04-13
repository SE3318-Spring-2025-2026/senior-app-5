import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '1rem' }}>
      <h1 style={{ fontSize: '2rem', color: '#334155' }}>403 — Access Denied</h1>
      <p style={{ color: '#64748b' }}>You don't have permission to view this page.</p>
      <button
        onClick={() => navigate(user ? '/groups' : '/login')}
        style={{ padding: '0.5rem 1.5rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
      >
        Go Back
      </button>
    </div>
  );
}
