import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, FileText, MessageSquare,
  UploadCloud, CheckCircle2, ArrowRight, Clock,
  RefreshCw, BookOpen, Layers,
} from 'lucide-react';
import apiClient from '../../utils/apiClient';
import apiConfig from '../../config/api';
import { uploadSubmissionDocument } from '../../utils/submissionService';

/* ─── design tokens ─────────────────────────────────────────────────── */
const surface = {
  card:    'bg-[#131316] border border-[#1f1f23]',
  card2:   'bg-[#0e0e10] border border-[#1f1f23]',
  hover:   'hover:bg-[#18181c] hover:border-[#2a2a30]',
  inset:   'bg-[#0a0a0b] border border-[#1c1c20]',
};

const STATUS_META = {
  Pending:       { label: 'Pending',        dot: '#fbbf24' },
  UnderReview:   { label: 'Under review',   dot: '#7dd3fc' },
  NeedsRevision: { label: 'Needs revision', dot: '#f97316' },
  Approved:      { label: 'Approved',       dot: '#34d399' },
  Rejected:      { label: 'Rejected',       dot: '#f87171' },
};
const getStatusMeta = (s) => STATUS_META[s] || { label: s || '—', dot: '#71717a' };

const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];
const getExt = (name = '') => name.split('.').pop()?.toLowerCase() || '';

/* ─── status pill ───────────────────────────────────────────────────── */
function StatusPill({ status }) {
  const { label, dot } = getStatusMeta(status);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#26262b] bg-[#18181c] px-2.5 py-0.5 text-[11px] font-medium text-zinc-300">
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
      {label}
    </span>
  );
}

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
function MetricStrip({ groupId, total, pending, approved }) {
  const metrics = [
    { label: 'Team',     value: `#${groupId?.slice(-6) || '—'}` },
    { label: 'Total',    value: total },
    { label: 'Pending',  value: pending },
    { label: 'Approved', value: approved },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-xl bg-[#1c1c20]">
      {metrics.map(({ label, value }, i) => (
        <div key={i} className="flex flex-col gap-3 bg-[#0e0e10] p-5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</span>
          <span className="text-[26px] font-semibold tabular-nums text-zinc-100 leading-none">{value}</span>
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
        <p className="text-[13px] font-medium text-zinc-200 transition-colors group-hover:text-zinc-100">{label}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-zinc-500">{description}</p>
      </div>
      <ArrowRight size={13} className="mt-1 shrink-0 text-zinc-700 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-zinc-400" />
    </Link>
  );
}

/* ─── quick upload ──────────────────────────────────────────────────── */
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
      setState({ loading: false, success: '', error: `Unsupported format · allowed: ${ALLOWED_EXT.join(', ')}` });
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setState({ loading: false, success: '', error: 'File exceeds 5 MB limit.' });
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
      setState({ loading: false, success: `"${name}" uploaded.`, error: '' });
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      const msg = err?.response?.data?.message;
      setState({
        loading: false, success: '',
        error: Array.isArray(msg) ? msg.join(', ') : (msg || 'Upload failed.'),
      });
    } finally {
      setProgress(0);
    }
  };

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#26262b] bg-[#18181c] text-zinc-500">
          <UploadCloud size={18} />
        </div>
        <div>
          <p className="text-[13px] font-medium text-zinc-300">No open submissions</p>
          <p className="mt-1 text-[12px] text-zinc-500">Upload from the dedicated page</p>
        </div>
        <Link to="/documents"
          className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-[#2a2a30] bg-[#18181c] px-3.5 py-2 text-[12px] font-medium text-zinc-300 transition-colors hover:border-[#3a3a40] hover:bg-[#1f1f23] hover:text-zinc-100">
          Open uploader <ArrowRight size={12} />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="w-full rounded-md border border-[#26262b] bg-[#0a0a0b] px-3 py-2.5 text-[13px] text-zinc-200 focus:border-[#3a3a40] focus:outline-none focus:ring-1 focus:ring-[#3a3a40]"
      >
        <option value="">Choose submission…</option>
        {submissions.map((s) => {
          const id = s._id || s.id || s.submissionId || '';
          const label = s.title || s.type || 'Untitled';
          const date = s.submittedAt || s.createdAt;
          return <option key={id} value={id}>{label}{date ? ` · ${new Date(date).toLocaleDateString()}` : ''}</option>;
        })}
      </select>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
        onClick={() => fileRef.current?.click()}
        className="cursor-pointer rounded-lg p-5 text-center transition-all duration-200"
        style={{
          border: `1.5px dashed ${isDragging ? '#52525b' : '#26262b'}`,
          background: isDragging ? '#18181c' : '#0a0a0b',
        }}
      >
        {file ? (
          <div className="flex items-center justify-center gap-2 text-[13px] text-zinc-200">
            <FileText size={14} className="text-zinc-400" />
            <span className="font-medium">{file.name}</span>
            <span className="text-[11px] text-zinc-500">({Math.round(file.size / 1024)} KB)</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
              className="ml-1 rounded px-1 text-zinc-500 transition-colors hover:text-rose-400"
            >×</button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <UploadCloud size={18} className="text-zinc-600" />
            <p className="text-[13px] text-zinc-500">
              Drop file or <span className="font-medium text-zinc-300">browse</span>
            </p>
            <p className="text-[11px] text-zinc-700">PDF, DOC, PNG, JPG · max 5 MB</p>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        onChange={(e) => handleFile(e.target.files?.[0])} className="hidden" />

      {state.loading && (
        <div className="space-y-1">
          <div className="h-1 w-full overflow-hidden rounded-full bg-[#1c1c20]">
            <div className="h-full rounded-full bg-zinc-300 transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-right text-[11px] text-zinc-500 tabular-nums">{progress}%</p>
        </div>
      )}

      {state.success && (
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-400">
          <CheckCircle2 size={13} /> {state.success}
        </p>
      )}
      {state.error && <p className="text-[12px] text-rose-400">{state.error}</p>}

      <button
        type="button"
        onClick={handleUpload}
        disabled={!selectedId || !file || state.loading}
        className="w-full rounded-md bg-zinc-100 py-2.5 text-[13px] font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#26262b] disabled:text-zinc-600"
      >
        {state.loading ? 'Uploading…' : 'Upload'}
      </button>
    </div>
  );
}

/* ─── no group view ─────────────────────────────────────────────────── */
function NoGroupView({ user }) {
  return (
    <div className="space-y-5">
      <div className={`relative overflow-hidden rounded-2xl p-7 ${surface.card}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Getting started</p>
        <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-zinc-100">
          Hello, {user?.firstName || 'Student'}.
        </h2>
        <p className="mt-2 max-w-md text-[13px] leading-relaxed text-zinc-500">
          You haven't joined a team yet. Browse available groups or create a new one to start tracking your project work.
        </p>
        <Link to="/groups"
          className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-4 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-white">
          Browse groups <ArrowRight size={13} />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ActionCard to="/groups"    icon={Users}      label="Join a group"     description="Find or create a project team" />
        <ActionCard to="/documents" icon={UploadCloud} label="Upload documents" description="Once you're assigned to a phase" />
        <ActionCard to="/grades"    icon={BookOpen}   label="View grades"      description="Check your academic scores" />
      </div>
    </div>
  );
}

/* ─── main view ─────────────────────────────────────────────────────── */
const StudentView = ({ user }) => {
  const [submissionsState, setSubmissionsState] = useState({ loading: true });
  const [submissions, setSubmissions] = useState([]);
  const [reviews] = useState([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const groupId = user?.teamId || user?.groupId;
    if (!groupId) { setSubmissionsState({ loading: false }); return; }
    (async () => {
      try {
        const res = await apiClient.get(apiConfig.endpoints.submissions.byGroup(groupId));
        setSubmissions(Array.isArray(res.data) ? res.data : (res.data?.data || []));
      } catch {
        setSubmissions([]);
      } finally {
        setSubmissionsState({ loading: false });
      }
    })();
  }, [user]);

  const groupId  = user?.teamId || user?.groupId;
  const total    = submissions.length;
  const pending  = submissions.filter((s) => s.status === 'Pending').length;
  const inReview = submissions.filter((s) => s.status === 'UnderReview').length;
  const approved = submissions.filter((s) => s.status === 'Approved').length;

  const comments = useMemo(() => reviews.flatMap((r) => r?.comments || []), [reviews]);
  const revisionRequests = useMemo(
    () => reviews.flatMap((r) => r?.revisionRequests || [])
      .filter((req) => !['Resolved', 'Closed', 'Completed'].includes(req.status)),
    [reviews],
  );

  const formatDate = (v) => {
    if (!v) return 'No due date';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? 'No due date' : d.toLocaleDateString();
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  if (submissionsState.loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 rounded-2xl bg-[#131316]" />
        <div className="grid grid-cols-2 gap-px rounded-xl bg-[#1c1c20] sm:grid-cols-4 overflow-hidden">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-[#0e0e10]" />)}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="h-56 rounded-2xl bg-[#131316] lg:col-span-3" />
          <div className="h-56 rounded-2xl bg-[#131316] lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!groupId) return <NoGroupView user={user} />;

  return (
    <div className="space-y-5">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <div className={`relative overflow-hidden rounded-2xl p-7 ${surface.card}`}>
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ background: 'radial-gradient(600px circle at 100% 0%, #ffffff, transparent 50%)' }} />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600">{today}</p>
            <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-zinc-100">
              Welcome back, <span className="text-zinc-400">{user?.firstName || 'Student'}</span>
            </h2>
            <p className="mt-1.5 text-[13px] text-zinc-500">
              {total === 0
                ? 'No submissions yet — start by uploading your first document.'
                : `You have ${total} submission${total !== 1 ? 's' : ''} · ${pending} pending review`}
            </p>
          </div>
          <Link to="/documents"
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md bg-zinc-100 px-4 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-white sm:self-auto">
            <UploadCloud size={14} /> New upload
          </Link>
        </div>
      </div>

      {/* ── Metrics ───────────────────────────────────────────── */}
      <MetricStrip groupId={groupId} total={total} pending={pending} approved={approved} />

      {/* ── Submissions + Quick upload ────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

        <div className={`rounded-2xl p-5 lg:col-span-3 ${surface.card}`}>
          <SectionLabel
            icon={FileText}
            action={
              <Link to="/documents"
                className="text-[11px] font-medium text-zinc-400 transition hover:text-zinc-100">
                + New
              </Link>
            }
          >
            Submissions
          </SectionLabel>

          {submissions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#26262b] bg-[#18181c] text-zinc-500">
                <FileText size={18} />
              </div>
              <p className="text-[13px] text-zinc-400">No submissions yet</p>
              <Link to="/documents"
                className="inline-flex items-center gap-1.5 rounded-md border border-[#2a2a30] bg-[#18181c] px-3.5 py-2 text-[12px] font-medium text-zinc-300 transition hover:border-[#3a3a40] hover:bg-[#1f1f23] hover:text-zinc-100">
                Upload first document <ArrowRight size={12} />
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {submissions.slice(0, 7).map((s, i) => {
                const id = s._id || s.id || s.submissionId || i;
                const title = s.title || s.type || 'Untitled';
                const date = s.submittedAt || s.createdAt;
                return (
                  <div key={id}
                    className="group flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-[#18181c]">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-zinc-200 group-hover:text-zinc-100">{title}</p>
                      {date && (
                        <p className="mt-0.5 text-[11px] text-zinc-600">
                          {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <StatusPill status={s.status} />
                  </div>
                );
              })}
              {submissions.length > 7 && (
                <p className="px-3 pt-2 text-[11px] text-zinc-700">+{submissions.length - 7} more</p>
              )}
            </div>
          )}
        </div>

        <div className={`rounded-2xl p-5 lg:col-span-2 ${surface.card}`}>
          <SectionLabel icon={UploadCloud}>Quick upload</SectionLabel>
          <QuickUpload submissions={submissions} />
        </div>
      </div>

      {/* ── Progress + Quick actions ──────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

        {total > 0 && (
          <div className={`rounded-2xl p-5 lg:col-span-2 ${surface.card}`}>
            <SectionLabel icon={Layers}>Progress</SectionLabel>
            <div className="space-y-4">
              {[
                { label: 'Approved',     count: approved, dot: '#34d399' },
                { label: 'Under review', count: inReview, dot: '#7dd3fc' },
                { label: 'Pending',      count: pending,  dot: '#fbbf24' },
              ].map(({ label, count, dot }) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-[12px] text-zinc-400">
                        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
                        {label}
                      </span>
                      <span className="text-[11px] font-medium tabular-nums text-zinc-500">
                        {count}<span className="text-zinc-700">/{total}</span>
                      </span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-[#1c1c20]">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: dot }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className={total > 0 ? 'lg:col-span-3' : 'lg:col-span-5'}>
          <div className="mb-3 flex items-center gap-2 px-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Quick actions</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ActionCard to="/groups"    icon={Users}      label="My Group"      description="Team members and advisor" />
            <ActionCard to="/documents" icon={UploadCloud} label="Upload"       description="Submit a file for review" />
            <ActionCard to="/grades"    icon={BookOpen}   label="Grades"        description="View academic scores" />
          </div>
        </div>
      </div>

      {/* ── Feedback + Revisions ──────────────────────────────── */}
      {(comments.length > 0 || revisionRequests.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          <div className={`rounded-2xl p-5 ${surface.card}`}>
            <SectionLabel icon={MessageSquare}>Feedback</SectionLabel>
            {comments.length === 0 ? (
              <p className="text-[13px] text-zinc-600">No feedback yet.</p>
            ) : (
              <ul className="space-y-3">
                {comments.slice(0, 5).map((c, i) => (
                  <li key={c.id || c._id || i}
                    className="border-l-2 border-zinc-700 pl-3 text-[13px] text-zinc-400">
                    <span className="font-medium text-zinc-300">{c.authorName || c.author?.name || 'Reviewer'}</span>
                    {': '}{c.text}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={`rounded-2xl p-5 ${surface.card}`}>
            <SectionLabel icon={RefreshCw}>Revisions</SectionLabel>
            {revisionRequests.length === 0 ? (
              <p className="text-[13px] text-zinc-600">No active revisions.</p>
            ) : (
              <ul className="space-y-2">
                {revisionRequests.slice(0, 5).map((req, i) => {
                  const past = req.dueDatetime && new Date(req.dueDatetime).getTime() < currentTime;
                  return (
                    <li key={req.id || req._id || i}
                      className="rounded-lg border border-[#1f1f23] bg-[#0e0e10] p-3 text-[13px]">
                      <p className="font-medium text-zinc-200">{req.description}</p>
                      <p className={`mt-1 flex items-center gap-1 text-[11px] font-medium ${past ? 'text-rose-400' : 'text-zinc-500'}`}>
                        <Clock size={10} /> Due {formatDate(req.dueDatetime)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentView;
