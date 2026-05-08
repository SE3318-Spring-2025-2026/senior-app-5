import { useNavigate } from 'react-router-dom';
import { Monitor, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Header = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const displayName = user?.name || user?.email || 'User';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-14 bg-[#080f1f] border-b border-[#1e293b] flex items-center px-6 justify-between shrink-0 z-10">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Monitor size={16} className="text-white" />
        </div>
        <span className="text-base font-bold text-white tracking-tight">ThesisOS</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Signed in as
          </span>
          <span className="text-sm font-semibold text-slate-200">
            {displayName}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-1.5
                     text-xs font-bold text-slate-300 uppercase tracking-widest
                     transition-all duration-150 hover:border-red-500/50 hover:text-red-400"
        >
          <LogOut size={13} />
          Logout
        </button>
      </div>
    </header>
  );
};
