import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MaskedBlueAmbientGlow } from './MaskedBlueAmbientGlow';
import { MaskedRedAmbientGlow } from './MaskedRedAmbientGlow';

const RED_AMBIENT_ROLES = new Set(['Student', 'TeamLeader', 'Professor']);

export const Layout = () => {
  const { user } = useAuth();
  const showCoordinatorBlue = user?.role === 'Coordinator';
  const showRedAmbient = user?.role && RED_AMBIENT_ROLES.has(user.role);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0a0a0b]">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="relative flex-1 overflow-y-auto p-6">
          {showCoordinatorBlue && <MaskedBlueAmbientGlow />}
          {showRedAmbient && <MaskedRedAmbientGlow />}
          <div className="relative z-10 mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
