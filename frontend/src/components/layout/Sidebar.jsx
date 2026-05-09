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
  Star,
  BookOpen,
  GitBranch,
  Kanban,
  Package,
  Activity,
  Lock,
  GraduationCap,
  BarChart2,
} from 'lucide-react';
import clsx from 'clsx';

const navLinkBase =
  'group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-150';
const navLinkDefault = 'text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-200';
const navLinkActive = 'bg-white/[0.06] text-zinc-100';

function SideNavLink({ to, icon: Icon, label, matchPrefix }) {
  const location = useLocation();
  const active = matchPrefix ? location.pathname.startsWith(to) : undefined;

  return (
    <NavLink
      to={to}
      end={!matchPrefix}
      className={({ isActive }) =>
        clsx(navLinkBase, (matchPrefix ? active : isActive) ? navLinkActive : navLinkDefault)
      }
    >
      {({ isActive }) => {
        const isOn = matchPrefix ? active : isActive;
        return (
          <>
            <span
              className={clsx(
                'absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full transition-colors',
                isOn ? 'bg-zinc-100' : 'bg-transparent'
              )}
            />
            <Icon size={15} className={clsx('shrink-0 transition-colors', isOn ? 'text-zinc-100' : 'text-zinc-500 group-hover:text-zinc-300')} />
            <span>{label}</span>
          </>
        );
      }}
    </NavLink>
  );
}

function SectionHeader({ label }) {
  return (
    <p className="px-3 pb-1.5 pt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
      {label}
    </p>
  );
}

export const Sidebar = () => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : { role: 'Student' };
  const role = user.role;

  return (
    <aside className="flex w-60 flex-none flex-col overflow-y-auto border-r border-[#1c1c20] bg-[#0e0e10] px-2.5 py-4">
      <nav className="flex flex-col gap-0.5">
        <SectionHeader label="General" />
        <SideNavLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" />

        {(role === 'Student' || role === 'TeamLeader') && (
          <>
            <SectionHeader label="Student" />
            <SideNavLink to="/groups" icon={Users} label="My Group" />
            <SideNavLink to="/my-submissions" icon={FileText} label="My Submissions" />
            <SideNavLink to="/documents" icon={FileText} label="Upload Document" />
            <SideNavLink to="/documents" icon={FileText} label="My Documents" />
            <SideNavLink to="/grades" icon={BarChart2} label="My Grades" />
            <SideNavLink to="/integrations" icon={Link2} label="Integrations" />
          </>
        )}

        {role === 'TeamLeader' && (
          <>
            <SectionHeader label="Team Leader" />
            <SideNavLink to="/scrum" icon={GitBranch} label="Scrum" />
          </>
        )}

        {role === 'Professor' && (
          <>
            <SectionHeader label="Professor" />
            <SideNavLink to="/review" icon={ClipboardCheck} label="Review" />
            <SideNavLink to="/professor/submissions" icon={FileText} label="Submissions" />
            <SideNavLink to="/professor/deliverable-grading" icon={GraduationCap} label="Deliverable Grading" />
            <SideNavLink to="/advisor/sprint-evaluation" icon={Star} label="Sprint Evaluation" />
            <SideNavLink to="/advisor/sprint-panel" icon={Activity} label="Sprint Panel" />
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
            <SideNavLink to="/coordinator/deliverables" icon={Package} label="Deliverables" />
            <SideNavLink to="/coordinator/rubrics" icon={BookOpen} label="Rubric Management" />
            <SideNavLink to="/coordinator/sprint-builder" icon={GitBranch} label="Sprint Builder" />
            <SideNavLink to="/scrum" icon={Kanban} label="Scrum" />
            <SideNavLink to="/advisor/sprint-panel" icon={Activity} label="Sprint Panel" />
            <SideNavLink to="/coordinator/sprint-finalize" icon={Lock} label="Finalize Sprint" />
            <SideNavLink to="/admin" icon={ShieldCheck} label="Admin Panel" matchPrefix />
          </>
        )}
      </nav>

      <div className="mt-auto border-t border-[#1c1c20] pt-3">
        <p className="px-3 text-[10px] text-zinc-700">v1.0 · ThesisOS</p>
      </div>
    </aside>
  );
};
