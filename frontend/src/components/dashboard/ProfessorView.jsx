import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, ClipboardList, ArrowRight, TrendingUp, BookOpen,
  CheckCircle2, PlusCircle,
} from 'lucide-react';
import StoryPointsPanel from './StoryPointsPanel';
import apiClient from '../../utils/apiClient';

/* ─── design tokens ─────────────────────────────────────────────────── */
const surface = {
  card:  'bg-[#131316] border border-[#1f1f23]',
  card2: 'bg-[#0e0e10] border border-[#1f1f23]',
  hover: 'hover:bg-[#18181c] hover:border-[#2a2a30]',
  inset: 'bg-[#0a0a0b] border border-[#1c1c20]',
};

/* ─── section label ─────────────────────────────────────────────────── */
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

/* ─── ProfessorView ─────────────────────────────────────────────────── */
const emptyForm = { groupId: '', title: '', type: '', phaseId: '' };

const ProfessorView = ({ user }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phases, setPhases] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [formFeedback, setFormFeedback] = useState({ loading: false, message: '', error: '' });

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

  useEffect(() => {
    apiClient.get('/phases').then((res) => {
      const data = res.data?.data ?? res.data ?? [];
      setPhases(Array.isArray(data) ? data : []);
    }).catch(() => setPhases([]));
  }, []);

  const handleFormChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateSubmission = async (e) => {
    e.preventDefault();
    if (!form.groupId || !form.title.trim() || !form.type.trim() || !form.phaseId) {
      setFormFeedback({ loading: false, message: '', error: 'Please fill in all fields.' });
      return;
    }
    setFormFeedback({ loading: true, message: '', error: '' });
    try {
      await apiClient.post('/submissions', {
        groupId: form.groupId,
        title: form.title.trim(),
        type: form.type.trim(),
        phaseId: form.phaseId,
      });
      setFormFeedback({ loading: false, message: 'Submission created successfully!', error: '' });
      setForm(emptyForm);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to create submission.';
      setFormFeedback({ loading: false, message: '', error: Array.isArray(msg) ? msg.join(', ') : msg });
    }
  };

  const approvedCount = groups.filter((g) => g.status === 'APPROVED').length;
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
              <span className="text-zinc-400">{user?.firstName || 'Professor'}</span>
            </h2>
            <p className="mt-1.5 text-[13px] text-zinc-500">
              You have{' '}
              <span className="font-medium text-zinc-300">
                {loading ? '…' : groups.length}
              </span>{' '}
              assigned group{groups.length !== 1 ? 's' : ''} this semester.
            </p>
          </div>
          <Link
            to="/review"
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md bg-zinc-100 px-4 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-white sm:self-auto"
          >
            <ClipboardList size={13} /> Review submissions
          </Link>
        </div>
      </div>

      {/* ── Metrics ───────────────────────────────────────────── */}
      <MetricStrip
        items={[
          { label: 'Assigned Groups', value: loading ? '…' : groups.length, sub: 'active this semester', icon: Users },
          { label: 'Approved',        value: loading ? '…' : approvedCount, sub: 'requests accepted',    icon: CheckCircle2 },
          { label: 'Submissions',     value: '—',                           sub: 'pending review',       icon: ClipboardList },
        ]}
      />

      {/* ── Assigned Groups table ─────────────────────────────── */}
      <div className={`rounded-2xl p-5 ${surface.card}`}>
        <SectionLabel icon={Users}>Assigned groups</SectionLabel>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-[#18181c] animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#26262b] bg-[#18181c] text-zinc-500">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[13px] font-medium text-zinc-300">No assigned groups</p>
              <p className="mt-1 text-[12px] text-zinc-500">You haven't been assigned to any groups yet.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1f1f23]">
                  <th className="pb-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Group ID
                  </th>
                  <th className="pb-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f23]">
                {groups.map((req) => (
                  <tr key={req.requestId ?? req.groupId} className="transition hover:bg-[#18181c]">
                    <td className="py-3 font-mono text-[12px] text-zinc-300">{req.groupId}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#26262b] bg-[#18181c] px-2.5 py-0.5 text-[11px] font-medium text-zinc-300">
                        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#34d399' }} />
                        {req.status ?? 'APPROVED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Submission ─────────────────────────────────── */}
      <div className={`rounded-2xl p-5 ${surface.card}`}>
        <SectionLabel icon={PlusCircle}>Create submission</SectionLabel>

        <form onSubmit={handleCreateSubmission} className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-zinc-500">Group</label>
            <select
              name="groupId"
              value={form.groupId}
              onChange={handleFormChange}
              className="w-full rounded-md border border-[#26262b] bg-[#0a0a0b] px-3 py-2.5 text-[13px] text-zinc-200 focus:border-[#3a3a40] focus:outline-none focus:ring-1 focus:ring-[#3a3a40]"
            >
              <option value="">Select a group…</option>
              {groups.map((req) => (
                <option key={req.groupId} value={req.groupId}>
                  {req.groupId}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-zinc-500">Title</label>
            <input
              name="title"
              value={form.title}
              onChange={handleFormChange}
              placeholder="e.g. Milestone 1 Report"
              className="w-full rounded-md border border-[#26262b] bg-[#0a0a0b] px-3 py-2.5 text-[13px] text-zinc-200 placeholder-zinc-600 focus:border-[#3a3a40] focus:outline-none focus:ring-1 focus:ring-[#3a3a40]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-zinc-500">Type</label>
            <select
              name="type"
              value={form.type}
              onChange={handleFormChange}
              className="w-full rounded-md border border-[#26262b] bg-[#0a0a0b] px-3 py-2.5 text-[13px] text-zinc-200 focus:border-[#3a3a40] focus:outline-none focus:ring-1 focus:ring-[#3a3a40]"
            >
              <option value="">Select a type…</option>
              <option value="Report">Report</option>
              <option value="Presentation">Presentation</option>
              <option value="Code">Code</option>
              <option value="Documentation">Documentation</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-zinc-500">Phase</label>
            <select
              name="phaseId"
              value={form.phaseId}
              onChange={handleFormChange}
              className="w-full rounded-md border border-[#26262b] bg-[#0a0a0b] px-3 py-2.5 text-[13px] text-zinc-200 focus:border-[#3a3a40] focus:outline-none focus:ring-1 focus:ring-[#3a3a40]"
            >
              <option value="">Select a phase…</option>
              {phases.map((p) => (
                <option key={p.phaseId ?? p._id} value={p.phaseId ?? p._id}>
                  {p.name ?? p.phaseName ?? p.phaseId ?? p._id}
                </option>
              ))}
            </select>
          </div>

          {formFeedback.error && (
            <p className="text-[12px] text-rose-400">{formFeedback.error}</p>
          )}
          {formFeedback.message && (
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-400">
              <CheckCircle2 size={13} /> {formFeedback.message}
            </p>
          )}

          <button
            type="submit"
            disabled={formFeedback.loading}
            className="inline-flex items-center gap-2 rounded-md bg-zinc-100 px-4 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#26262b] disabled:text-zinc-600"
          >
            <PlusCircle size={14} />
            {formFeedback.loading ? 'Creating…' : 'Create Submission'}
          </button>
        </form>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center gap-2 px-0.5">
          <TrendingUp size={13} className="text-zinc-600" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Quick actions
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ActionCard to="/grades" icon={BookOpen}      label="View Grades"        description="Access academic grades" />
          <ActionCard to="/review" icon={ClipboardList} label="Review Submissions" description="Review and provide feedback" />
        </div>
      </div>

      {/* ── Story Points ──────────────────────────────────────── */}
      <StoryPointsPanel canOverride={false} />
    </div>
  );
};

export default ProfessorView;
