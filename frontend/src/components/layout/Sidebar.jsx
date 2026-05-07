import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Link2,
  Users,
  FileText,
  ClipboardCheck,
  UserCheck,
  Settings2,
  Calendar,
  CalendarDays,
  ShieldCheck,
} from 'lucide-react';
import clsx from 'clsx';

const navLinkBase =
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150';
const navLinkDefault = 'text-slate-400 hover:text-slate-200 hover:bg-white/5';
const navLinkActive = 'bg-blue-600/15 text-blue-400 border-l-2 border-blue-500 rounded-l-none';

function SideNavLink({ to, icon: Icon, label, matchPrefix }) {
  const location = useLocation();
  const active = matchPrefix
    ? location.pathname.startsWith(to)
    : undefined;

  return (
    <NavLink
      to={to}
      end={!matchPrefix}
      className={({ isActive }) =>
        clsx(navLinkBase, (matchPrefix ? active : isActive) ? navLinkActive : navLinkDefault)
      }
    >
      <Icon size={16} className="shrink-0" />
      <span>{label}</span>
    </NavLink>
  );
}

function SectionHeader({ label }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-3 pt-4 pb-1">
      {label}
    </p>
  );
}

export const Sidebar = () => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : { role: 'Student' };
  const role = user.role;

  return (
    <aside className="w-60 flex-none bg-[#080f1f] border-r border-[#1e293b] flex flex-col py-4 px-3 overflow-y-auto">
      <nav className="flex flex-col gap-0.5">
        <SideNavLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        <SideNavLink to="/integrations" icon={Link2} label="Integrations" />

        {(role === 'Student' || role === 'TeamLeader') && (
          <>
            <SectionHeader label="Student" />
            <SideNavLink to="/groups" icon={Users} label="My Group" />
            <SideNavLink to="/documents" icon={FileText} label="My Documents" />
          </>
        )}

        {role === 'Professor' && (
          <>
            <SectionHeader label="Professor" />
            <SideNavLink to="/review" icon={ClipboardCheck} label="Review" />
          </>
        )}

        {(role === 'Professor' || role === 'Advisor') && (
          <>
            <SectionHeader label="Advisor" />
            <SideNavLink to="/advisor/requests" icon={UserCheck} label="Advisee Requests" />
          </>
        )}

        {role === 'Coordinator' && (
          <>
            <SectionHeader label="Coordinator" />
            <SideNavLink to="/coordinator-management" icon={Settings2} label="Coordinator Suite" />
            <SideNavLink to="/coordinator/advisor-schedule" icon={Calendar} label="Advisor Schedule" />
            <SideNavLink to="/phases/schedule" icon={CalendarDays} label="Phase Scheduling" />
            <SideNavLink to="/admin" icon={ShieldCheck} label="Admin Panel" matchPrefix />
          </>
        )}
      </nav>
    </aside>
  );
};
