import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, BookOpen, ClipboardList, ArrowRight, TrendingUp,
  Shield, Clock, CalendarClock, FileText,
} from 'lucide-react';
import StoryPointsPanel from './StoryPointsPanel';
import apiClient from '../../utils/apiClient';

/* ─── design tokens ─────────────────────────────────────────────────── */
const surface = {
  card:  'bg-[#131316] border border-[#1f1f23]',
  card2: 'bg-[#0e0e10] border border-[#1f1f23]',
  hover: 'hover:bg-[#18181c] hover:border-[#2a2a30]',
};

/* ─── section title ─────────────────────────────────────────────────── */
function SectionLabel({ icon: Icon, children, action }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={13} className="text-zinc-600" />}
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {children}
        </span>
      </div>
      {action}
    </div>
  );
}

/* ─── metric strip ──────────────────────────────────────────────────── */
function MetricStrip({ items }) {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-[#1c1c20] sm:grid-cols-3">
      {items.map(({ label, value, sub, icon: Icon }, i) => (
        <div key={i} className="flex flex-col gap-3 bg-[#0e0e10] p-5">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={12} className="text-zinc-600" />}
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {label}
            </span>
          </div>
          <span className="text-[26px] font-semibold tabular-nums leading-none text-zinc-100">
            {value}
          </span>
          {sub && <span className="text-[11px] text-zinc-600">{sub}</span>}
        </div>
      ))}
    </div>
  );
}

/* ─── action card ───────────────────────────────────────────────────── */
function ActionCard({ to, icon: Icon, label, description }) {
  return (
    <Link
      to={to}
      className={`group flex items-start gap-3 rounded-xl p-4 transition-all duration-200 ${surface.card} ${surface.hover}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#26262b] bg-[#18181c] text-zinc-300 transition-colors group-hover:border-[#3a3a40] group-hover:text-zinc-100">
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-zinc-200 transition-colors group-hover:text-zinc-100">
          {label}
        </p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-zinc-500">
          {description}
        </p>
      </div>
      <ArrowRight
        size={13}
        className="mt-1 shrink-0 text-zinc-700 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-zinc-400"
      />
    </Link>
  );
}

/* ─── main view ─────────────────────────────────────────────────────── */
const CoordinatorView = ({ user }) => {
  const [metrics, setMetrics] = useState({
    committees: '—',
    advisors: '—',
    pendingRequests: '—',
    loading: true,
  });

  useEffect(() => {
    (async () => {
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
        loading: false,
      });
    })();
  }, []);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div className="space-y-5">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <div className={`relative overflow-hidden rounded-2xl p-7 ${surface.card}`}>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ background: 'radial-gradient(600px circle at 100% 0%, #ffffff, transparent 50%)' }}
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
              {today}
            </p>
            <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-zinc-100">
              Welcome back,{' '}
              <span className="text-zinc-400">{user?.firstName || 'Coordinator'}</span>
            </h2>
            <p className="mt-1.5 text-[13px] text-zinc-500">
              System overview and administrative controls are available below.
            </p>
          </div>
          <Link
            to="/coordinator-management"
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md bg-zinc-100 px-4 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-white sm:self-auto"
          >
            <Shield size={13} /> Open Suite
          </Link>
        </div>
      </div>

      {/* ── Metrics ───────────────────────────────────────────── */}
      <MetricStrip
        items={[
          { label: 'Committees',       value: metrics.committees,      sub: 'registered',         icon: Users },
          { label: 'Advisors',         value: metrics.advisors,        sub: 'faculty members',    icon: BookOpen },
          { label: 'Pending requests', value: metrics.pendingRequests, sub: 'awaiting decision',  icon: Clock },
        ]}
      />

      {/* ── Administrative access ─────────────────────────────── */}
      <div className={`rounded-2xl p-5 ${surface.card}`}>
        <SectionLabel icon={Shield}>Administrative access</SectionLabel>
        <p className="mb-4 text-[13px] text-zinc-500">
          As <span className="font-medium text-zinc-300">Coordinator</span>, you have overarching
          authority to manage system-wide configurations, audit academic progress, and oversee all
          departments.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ActionCard to="/committees"
            icon={Users}        label="Manage Committees"  description="View and configure committee groups" />
          <ActionCard to="/advisors"
            icon={BookOpen}     label="Manage Advisors"    description="Review advisor assignments" />
          <ActionCard to="/phases/schedule"
            icon={ClipboardList} label="Manage Phases"     description="Configure project phases" />
          <ActionCard to="/grades"
            icon={TrendingUp}   label="View All Grades"    description="Monitor academic performance" />
          <ActionCard to="/advisor/requests"
            icon={FileText}     label="Advisor Requests"   description="Review team advisor request submissions" />
          <ActionCard to="/coordinator-management"
            icon={CalendarClock} label="Advisor Selection Schedule" description="Set the window for team leaders to submit requests" />
        </div>
      </div>

      {/* ── Story Points ──────────────────────────────────────── */}
      <div className={`rounded-2xl p-5 ${surface.card}`}>
        <SectionLabel icon={TrendingUp}>Sprint story points</SectionLabel>
        <StoryPointsPanel canOverride />
      </div>
      {/* Story Points */}
      <StoryPointsPanel canOverride={false} />
    </div>
  );
};

export default CoordinatorView;
