import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ClipboardList, ArrowRight, TrendingUp, BookOpen, CheckCircle2 } from 'lucide-react';
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

/* ── ProfessorView ────────────────────────────────────────── */
const ProfessorView = ({ user }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/requests', { params: { status: 'APPROVED', limit: 100 } });
        const data = res.data?.data ?? res.data ?? [];
        setGroups(Array.isArray(data) ? data : []);
      } catch {
        setGroups([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div
        style={{ background: 'linear-gradient(135deg,#0f2851 0%,#0f172a 60%)', borderColor: '#1e3a5f' }}
        className="rounded-2xl border p-6"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">Academic Portal</p>
        <h2 className="text-xl font-bold text-slate-100">
          Welcome back, {user?.firstName || 'Professor'} 👋
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          You have <span className="font-semibold text-slate-200">{loading ? '…' : groups.length}</span> assigned group{groups.length !== 1 ? 's' : ''} this semester.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Users}       label="Assigned Groups" value={loading ? '…' : groups.length} sub="active this semester" accent="#38bdf8" />
        <StatCard icon={CheckCircle2}label="Approved"        value={loading ? '…' : groups.filter((g) => g.status === 'APPROVED').length} sub="requests accepted" accent="#10b981" />
        <StatCard icon={ClipboardList} label="Submissions"   value="—"                              sub="pending review"      accent="#f59e0b" />
      </div>

      {/* Assigned Groups table */}
      <SectionCard title="Assigned Groups" icon={Users}>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-500">
              <Users size={24} />
            </div>
            <div>
              <p className="font-semibold text-slate-300">No assigned groups</p>
              <p className="mt-1 text-sm text-slate-500">You haven't been assigned to any groups yet.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="pb-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500">Group ID</th>
                  <th className="pb-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {groups.map((req) => (
                  <tr key={req.requestId ?? req.groupId} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 font-mono text-xs text-slate-300">{req.groupId}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                        {req.status ?? 'APPROVED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Quick Actions */}
      <SectionCard title="Quick Actions" icon={TrendingUp}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickActionLink to="/grades"  icon={BookOpen}     label="View Grades"         description="Access academic grades"         accent="#10b981" />
          <QuickActionLink to="/review"  icon={ClipboardList} label="Review Submissions" description="Review and provide feedback"    accent="#38bdf8" />
        </div>
      </SectionCard>

      {/* Story Points */}
      <StoryPointsPanel canOverride={false} />
    </div>
  );
};

export default ProfessorView;
