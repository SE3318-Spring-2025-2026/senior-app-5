import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Header = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const displayName = user?.name || user?.email || 'User';
  const initials = displayName
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="z-10 flex h-14 shrink-0 items-center justify-between border-b border-[#1c1c20] bg-[#0e0e10] px-6">
      <div className="flex min-w-[240px] items-center">
        <span className="text-[18px] font-medium tracking-[0.035em] text-zinc-100 [font-family:'Inter_Tight',ui-sans-serif,system-ui]">
          ThesisOS
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden flex-col items-end leading-tight sm:flex">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">Signed in</span>
          <span className="text-[13px] font-medium text-zinc-200">{displayName}</span>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a1d] text-[11px] font-semibold text-zinc-300 ring-1 ring-[#26262b]">
          {initials || 'U'}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-md border border-[#26262b] bg-[#141417] px-3 py-1.5 text-[12px] font-medium text-zinc-300 transition-colors duration-150 hover:border-[#3a3a40] hover:bg-[#1a1a1d] hover:text-zinc-100"
        >
          <LogOut size={13} />
          Logout
        </button>
      </div>
    </header>
  );
};
