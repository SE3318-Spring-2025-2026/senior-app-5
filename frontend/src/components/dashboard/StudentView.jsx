import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, FileText, AlertCircle, MessageSquare,
  UploadCloud, CheckCircle2, ArrowRight, Clock,
  RefreshCw, TrendingUp, BookOpen,
} from 'lucide-react';
import apiClient from '../../utils/apiClient';
import apiConfig from '../../config/api';
import { uploadSubmissionDocument } from '../../utils/submissionService';

/* ── helpers ─────────────────────────────────────────────── */
const STATUS_META = {
  Pending:       { label: 'Pending',        color: 'text-yellow-400',  bg: 'bg-yellow-400/10 border-yellow-400/20' },
  UnderReview:   { label: 'Under Review',   color: 'text-blue-400',    bg: 'bg-blue-400/10 border-blue-400/20' },
  NeedsRevision: { label: 'Needs Revision', color: 'text-orange-400',  bg: 'bg-orange-400/10 border-orange-400/20' },
  Approved:      { label: 'Approved',       color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  Rejected:      { label: 'Rejected',       color: 'text-red-400',     bg: 'bg-red-400/10 border-red-400/20' },
};
const getStatusMeta = (s) => STATUS_META[s] || { label: s || '—', color: 'text-slate-400', bg: 'bg-slate-400/10 border-slate-400/20' };

const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];
const getExt = (name = '') => name.split('.').pop()?.toLowerCase() || '';

/* ── reusable sub-components ─────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, accent = '#6366f1' }) {
  return (
    <div
      style={{ background: '#111827', borderColor: '#1e293b' }}
      className="rounded-2xl border p-5 flex items-center gap-4"
    >
      <div
        style={{ background: `${accent}18`, color: accent }}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
      >
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

function StatusBadge({ status }) {
  const meta = getStatusMeta(status);
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.color} ${meta.bg}`}>
      {meta.label}
    </span>
  );
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-500">
        <Icon size={24} />
      </div>
      <div>
        <p className="font-semibold text-slate-300">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, action }) {
  return (
    <div style={{ background: '#111827', borderColor: '#1e293b' }} className="rounded-2xl border p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          {Icon && <Icon size={13} />}
          {title}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

function QuickActionLink({ to, icon: Icon, label, description, accent = '#6366f1' }) {
  return (
    <Link
      to={to}
      style={{ borderColor: '#1e293b' }}
      className="group flex items-center gap-4 rounded-xl border p-4 transition hover:border-indigo-500/50 hover:bg-indigo-500/5"
    >
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

/* ── Quick Upload widget ──────────────────────────────────── */
function QuickUpload({ submissions }) {
  const fileRef = useRef(null);
  const [selectedId, setSelectedId] = useState('');
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState({ loading: false, success: '', error: '' });

  const handleFile = (f) => {
    setState({ loading: false, success: '', error: '' });
    if (!f) return;
    if (!ALLOWED_EXT.includes(getExt(f.name))) {
      setState({ loading: false, success: '', error: `Unsupported format. Allowed: ${ALLOWED_EXT.join(', ')}` });
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setState({ loading: false, success: '', error: 'File too large. Maximum size is 5 MB.' });
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!selectedId || !file || state.loading) return;
    setState({ loading: true, success: '', error: '' });
    setProgress(0);
    try {
      const result = await uploadSubmissionDocument(selectedId, file, setProgress);
      const name = result?.document?.originalName || file.name;
      setState({ loading: false, success: `"${name}" uploaded successfully.`, error: '' });
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      const msg = err?.response?.data?.message;
      setState({
        loading: false,
        success: '',
        error: Array.isArray(msg) ? msg.join(', ') : (msg || 'Upload failed. Please try again.'),
      });
    } finally {
      setProgress(0);
    }
  };

  return (
    <SectionCard title="Quick Upload" icon={UploadCloud}>
      {submissions.length === 0 ? (
        <EmptyState
          icon={UploadCloud}
          title="No submissions available"
          description="Upload documents from the dedicated upload page."
          action={
            <Link
              to="/documents/upload"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Go to Upload <ArrowRight size={14} />
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">Select a submission…</option>
            {submissions.map((s) => {
              const id = s._id || s.id || s.submissionId || '';
              const label = s.title || s.type || 'Untitled';
              const date = s.submittedAt || s.createdAt;
              return (
                <option key={id} value={id}>
                  {label}{date ? ` — ${new Date(date).toLocaleDateString()}` : ''}
                </option>
              );
            })}
          </select>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? '#6366f1' : '#334155'}`,
              borderRadius: 10, padding: '20px 16px', cursor: 'pointer',
              background: isDragging ? 'rgba(99,102,241,0.07)' : '#0f172a',
              transition: 'border-color 0.15s, background 0.15s', textAlign: 'center',
            }}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-200">
                <FileText size={16} className="text-indigo-400" />
                <span className="font-medium">{file.name}</span>
                <span className="text-slate-500 text-xs">({Math.round(file.size / 1024)} KB)</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                  className="ml-2 rounded border border-slate-600 px-1.5 text-slate-400 hover:border-red-500 hover:text-red-400"
                >×</button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-slate-500 text-sm">
                <UploadCloud size={22} className="text-slate-600" />
                <span>Drag &amp; drop or <span className="text-indigo-400 font-semibold">click to browse</span></span>
                <span className="text-xs text-slate-600">PDF, DOC, DOCX, PNG, JPG, JPEG — max 5 MB</span>
              </div>
            )}
          </div>

          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            onChange={(e) => handleFile(e.target.files?.[0])} style={{ display: 'none' }} />

          {state.loading && (
            <div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-right text-xs text-slate-500">{progress}%</p>
            </div>
          )}
          {state.success && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-400">
              <CheckCircle2 size={14} /> {state.success}
            </p>
          )}
          {state.error && <p className="text-sm text-red-400">{state.error}</p>}

          <button type="button" onClick={handleUpload}
            disabled={!selectedId || !file || state.loading}
            className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {state.loading ? 'Uploading…' : 'Upload Document'}
          </button>
        </div>
      )}
    </SectionCard>
  );
}

/* ── No-group onboarding view ────────────────────────────── */
function NoGroupView({ user }) {
  return (
    <div className="space-y-6">
      <div
        style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#0f172a 60%)', borderColor: '#3730a3' }}
        className="rounded-2xl border p-6"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1">Getting Started</p>
        <h2 className="text-xl font-bold text-slate-100">Welcome, {user?.firstName || 'Student'} 👋</h2>
        <p className="mt-2 text-sm text-slate-400">
          You haven't joined a team yet. Browse available groups or create one to start tracking your project.
        </p>
        <Link
          to="/groups"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Manage Groups <ArrowRight size={14} />
        </Link>
      </div>

      <SectionCard title="What you can do" icon={TrendingUp}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickActionLink to="/groups"          icon={Users}      label="Join a Group"      description="Find and join a project team"     accent="#6366f1" />
          <QuickActionLink to="/grades"          icon={BookOpen}   label="View Grades"        description="Check your academic scores"        accent="#10b981" />
          <QuickActionLink to="/documents/upload" icon={UploadCloud} label="Upload Documents" description="Submit files once assigned"        accent="#f59e0b" />
        </div>
      </SectionCard>
    </div>
  );
}

/* ── Main StudentView ────────────────────────────────────── */
const StudentView = ({ user }) => {
  const [submissionsState, setSubmissionsState] = useState({ loading: true, error: '' });
  const [submissions, setSubmissions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const groupId = user?.teamId || user?.groupId;
    if (!groupId) { setSubmissionsState({ loading: false, error: '' }); return; }
    const load = async () => {
      try {
        const res = await apiClient.get(apiConfig.endpoints.submissions.byGroup(groupId));
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setSubmissions(list);
        setSubmissionsState({ loading: false, error: '' });
      } catch {
        setSubmissions([]);
        setSubmissionsState({ loading: false, error: '' });
      }
    };
    load();
  }, [user]);

  const groupId    = user?.teamId || user?.groupId;
  const total      = submissions.length;
  const pending    = submissions.filter((s) => s.status === 'Pending').length;
  const inReview   = submissions.filter((s) => s.status === 'UnderReview').length;
  const approved   = submissions.filter((s) => s.status === 'Approved').length;

  const comments = useMemo(() => reviews.flatMap((r) => r?.comments || []), [reviews]);
  const revisionRequests = useMemo(
    () => reviews.flatMap((r) => r?.revisionRequests || []).filter((req) => !['Resolved', 'Closed', 'Completed'].includes(req.status)),
    [reviews],
  );

  const formatDate = (v) => {
    if (!v) return 'No due date';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? 'No due date' : d.toLocaleDateString();
  };

  /* Loading skeleton */
  if (submissionsState.loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ background: '#111827', borderColor: '#1e293b' }}
              className="rounded-2xl border p-5 animate-pulse h-24" />
          ))}
        </div>
        <div style={{ background: '#111827', borderColor: '#1e293b' }} className="rounded-2xl border p-5 h-40 animate-pulse" />
      </div>
    );
  }

  /* No group → onboarding */
  if (!groupId) return <NoGroupView user={user} />;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div
        style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#0f172a 60%)', borderColor: '#3730a3' }}
        className="rounded-2xl border p-6"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1">Dashboard</p>
        <h2 className="text-xl font-bold text-slate-100">Welcome back, {user?.firstName || 'Student'} 👋</h2>
        <p className="mt-1 text-sm text-slate-400">Here's an overview of your project progress and recent activity.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Users}        label="Group"       value={`#${groupId.slice(-6)}`}  sub="Active team"    accent="#6366f1" />
        <StatCard icon={FileText}     label="Submissions" value={submissionsState.loading ? '…' : total}      sub="total"          accent="#38bdf8" />
        <StatCard icon={Clock}        label="Pending"     value={submissionsState.loading ? '…' : pending}    sub="awaiting review" accent="#f59e0b" />
        <StatCard icon={CheckCircle2} label="Approved"    value={submissionsState.loading ? '…' : approved}   sub="completed"      accent="#10b981" />
      </div>

      {/* Recent Submissions + Quick Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard
          title="Recent Submissions"
          icon={FileText}
          action={
            <Link to="/documents/upload"
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500">
              + Upload
            </Link>
          }
        >
          {submissions.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No submissions yet"
              description="Upload your first document to get started."
              action={
                <Link to="/documents/upload"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">
                  Upload Document <ArrowRight size={14} />
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-800/70">
              {submissions.slice(0, 6).map((s, i) => {
                const id = s._id || s.id || s.submissionId || i;
                const title = s.title || s.type || 'Untitled submission';
                const date = s.submittedAt || s.createdAt;
                return (
                  <li key={id} className="flex items-center justify-between py-3 gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-200 truncate">{title}</p>
                      {date && <p className="text-xs text-slate-500 mt-0.5">{new Date(date).toLocaleDateString()}</p>}
                    </div>
                    <StatusBadge status={s.status} />
                  </li>
                );
              })}
            </ul>
          )}
          {submissions.length > 6 && (
            <p className="mt-3 text-xs text-slate-500">{submissions.length - 6} more submissions…</p>
          )}
        </SectionCard>

        <QuickUpload submissions={submissions} />
      </div>

      {/* Submission Progress */}
      {total > 0 && (
        <SectionCard title="Submission Progress" icon={TrendingUp}>
          <div className="space-y-3">
            {[
              { label: 'Approved',     count: approved,  color: '#10b981', bg: '#10b98120' },
              { label: 'Under Review', count: inReview,  color: '#38bdf8', bg: '#38bdf820' },
              { label: 'Pending',      count: pending,   color: '#f59e0b', bg: '#f59e0b20' },
            ].map(({ label, count, color, bg }) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-400">{label}</span>
                    <span className="text-xs font-bold text-slate-300">{count} / {total}</span>
                  </div>
                  <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: bg }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Quick Actions */}
      <SectionCard title="Quick Actions" icon={TrendingUp}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickActionLink to="/groups"          icon={Users}      label="Group Management"  description="Manage team & advisor requests" accent="#6366f1" />
          <QuickActionLink to="/documents/upload" icon={UploadCloud} label="Upload Document" description="Submit files for a phase"        accent="#f59e0b" />
          <QuickActionLink to="/grades"          icon={BookOpen}   label="View Grades"        description="Check your academic scores"     accent="#10b981" />
        </div>
      </SectionCard>

      {/* Feedback + Revision Requests — only shown when data exists */}
      {(comments.length > 0 || revisionRequests.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SectionCard title="Feedback" icon={MessageSquare}>
            {comments.length === 0 ? (
              <p className="text-sm text-slate-500">No feedback posted yet.</p>
            ) : (
              <ul className="space-y-3">
                {comments.slice(0, 5).map((c, i) => (
                  <li key={c.id || c._id || i} className="text-sm text-slate-300 border-l-2 border-indigo-500/40 pl-3">
                    <span className="font-semibold text-slate-200">{c.authorName || c.author?.name || 'Reviewer'}:</span>{' '}
                    {c.text}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Revision Requests" icon={RefreshCw}>
            {revisionRequests.length === 0 ? (
              <p className="text-sm text-slate-500">No active revision requests.</p>
            ) : (
              <ul className="space-y-3">
                {revisionRequests.slice(0, 5).map((req, i) => {
                  const past = req.dueDatetime && new Date(req.dueDatetime).getTime() < currentTime;
                  return (
                    <li key={req.id || req._id || i}
                      className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-sm text-slate-300">
                      <p className="font-medium text-slate-200">{req.description}</p>
                      <p className={`mt-1 text-xs font-semibold flex items-center gap-1 ${past ? 'text-red-400' : 'text-slate-500'}`}>
                        <Clock size={11} /> Due {formatDate(req.dueDatetime)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
};

export default StudentView;
