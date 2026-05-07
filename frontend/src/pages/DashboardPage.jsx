import StudentView from '../components/dashboard/StudentView';
import ProfessorView from '../components/dashboard/ProfessorView';
import CoordinatorView from '../components/dashboard/CoordinatorView';
import { PageHeader } from '../components/ui';

const DashboardPage = () => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (!user) return null;

  const roleLabel = {
    Student: 'Student',
    TeamLeader: 'Team Leader',
    Professor: 'Professor',
    Coordinator: 'Coordinator',
  }[user.role] ?? user.role;

  const renderContent = () => {
    switch (user.role) {
      case 'Student':
      case 'TeamLeader':
        return <StudentView user={user} />;
      case 'Professor':
        return <ProfessorView user={user} />;
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
