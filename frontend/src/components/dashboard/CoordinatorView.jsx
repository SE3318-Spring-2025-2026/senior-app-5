import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, ClipboardList, ArrowRight, TrendingUp, Shield, Clock, CalendarClock, FileText } from 'lucide-react';
import StoryPointsPanel from './StoryPointsPanel';
import apiClient from '../../utils/apiClient';

/* ── Shared primitives ───────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, accent = '#6366f1' }) {
  return (
    <div style={{ background: '#111827', borderColor: '#1e293b' }} className="rounded-2xl border p-5 flex items-center gap-4">
      <div style={{ background: `${accent}18`, color: accent }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-slate-100 leading-none">{value}</p>
        {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div style={{ background: '#111827', borderColor: '#1e293b' }} className="rounded-2xl border p-5">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-4">
        {Icon && <Icon size={13} />}{title}
      </p>
      {children}
    </div>
  );
}

function QuickActionLink({ to, icon: Icon, label, description, accent = '#6366f1' }) {
  return (
    <Link to={to} style={{ borderColor: '#1e293b' }}
      className="group flex items-center gap-4 rounded-xl border p-4 transition hover:border-indigo-500/50 hover:bg-indigo-500/5">
      <div style={{ background: `${accent}18`, color: accent }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-200">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <ArrowRight size={16} className="shrink-0 text-slate-600 transition group-hover:text-indigo-400" />
    </Link>
  );
}

/* ── CoordinatorView ─────────────────────────────────────── */
const CoordinatorView = ({ user }) => {
  const [metrics, setMetrics] = useState({ committees: '…', advisors: '…', pendingRequests: '…' });

  useEffect(() => {
    const load = async () => {
      const [committeesRes, advisorsRes, requestsRes] = await Promise.allSettled([
        apiClient.get('/committees', { params: { limit: 1 } }),
        apiClient.get('/advisors',   { params: { limit: 1 } }),
        apiClient.get('/requests',   { params: { status: 'PENDING', limit: 1 } }),
      ]);
      setMetrics({
        committees:
          committeesRes.status === 'fulfilled'
            ? String(committeesRes.value.data?.total ?? committeesRes.value.data?.length ?? '—')
            : '—',
        advisors:
          advisorsRes.status === 'fulfilled'
            ? String(advisorsRes.value.data?.total ?? advisorsRes.value.data?.length ?? '—')
            : '—',
        pendingRequests:
          requestsRes.status === 'fulfilled'
            ? String(requestsRes.value.data?.total ?? requestsRes.value.data?.data?.length ?? '—')
            : '—',
      });
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div
        style={{ background: 'linear-gradient(135deg,#1a0f3c 0%,#0f172a 60%)', borderColor: '#4c1d95' }}
        className="rounded-2xl border p-6"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-1">Coordinator Portal</p>
        <h2 className="text-xl font-bold text-slate-100">
          Welcome back, {user?.firstName || 'Coordinator'} 👋
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          System overview and administrative controls are available below.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Users}        label="Committees"       value={metrics.committees}      sub="registered"          accent="#38bdf8" />
        <StatCard icon={BookOpen}     label="Advisors"         value={metrics.advisors}        sub="faculty members"     accent="#10b981" />
        <StatCard icon={Clock}        label="Pending Requests" value={metrics.pendingRequests} sub="awaiting decision"   accent="#f59e0b" />
      </div>

      {/* Admin info */}
      <SectionCard title="Administrative Access" icon={Shield}>
        <p className="text-sm text-slate-400 mb-4">
          As <span className="font-semibold text-slate-200">Coordinator</span>, you have overarching authority to manage system-wide
          configurations, audit academic progress, and oversee all departments.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickActionLink to="/committees" icon={Users}        label="Manage Committees"  description="View and configure committee groups" accent="#38bdf8" />
          <QuickActionLink to="/advisors"   icon={BookOpen}     label="Manage Advisors"    description="Review advisor assignments"          accent="#10b981" />
          <QuickActionLink to="/phases"     icon={ClipboardList} label="Manage Phases"     description="Configure project phases"            accent="#6366f1" />
          <QuickActionLink to="/grades"     icon={TrendingUp}   label="View All Grades"    description="Monitor academic performance"        accent="#f59e0b" />
          <QuickActionLink to="/advisor/requests" icon={FileText} label="Advisor Requests" description="Review team advisor request submissions" accent="#f472b6" />
          <QuickActionLink to="/coordinator/advisor-schedule" icon={CalendarClock} label="Advisor Selection Schedule" description="Set the window for team leaders to submit requests" accent="#a78bfa" />
        </div>
      </SectionCard>

      {/* Story Points */}
      <StoryPointsPanel canOverride={false} />
    </div>
  );
};

export default CoordinatorView;
