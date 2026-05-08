import { useState, useEffect } from 'react';
import StudentView from '../components/dashboard/StudentView';
import ProfessorView from '../components/dashboard/ProfessorView';
import CoordinatorView from '../components/dashboard/CoordinatorView';
import { PageHeader } from '../components/ui';
import apiClient from '../utils/apiClient';

const DashboardPage = () => {
  const [user, setUser] = useState(() => {
    const str = localStorage.getItem('user');
    return str ? JSON.parse(str) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/auth/me')
      .then((res) => {
        const fresh = res.data;
        localStorage.setItem('user', JSON.stringify(fresh));
        setUser(fresh);
      })
      .catch(() => {
        // keep stale user data if refresh fails
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading && !user) return null;

  if (!user) return null;

  const roleLabel = {
    Student: 'Student',
    TeamLeader: 'Team Leader',
    Professor: 'Professor',
    Coordinator: 'Coordinator',
    Admin: 'Admin',
  }[user.role] ?? user.role;

  const renderContent = () => {
    switch (user.role) {
      case 'Student':
      case 'TeamLeader':
        return <StudentView user={user} />;
      case 'Professor':
        return <ProfessorView user={user} />;
      case 'Admin':
      case 'Coordinator':
        return <CoordinatorView user={user} />;
      default:
        return (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-400">
            Your role ({user.role}) does not have a dashboard view.
          </div>
        );
    }
  };

  return (
    <div>
      <PageHeader
        title={`${roleLabel} Dashboard`}
        subtitle={`Welcome back, ${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()}
      />
      {renderContent()}
    </div>
  );
};

export default DashboardPage;
