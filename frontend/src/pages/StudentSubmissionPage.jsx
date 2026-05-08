import { useRef, useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, X, Loader2, Plus, AlertCircle } from 'lucide-react';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import { PageHeader } from '../components/ui';

const getId = (s) => s?._id || s?.id || s?.submissionId || '';
const TYPE_OPTIONS = ['Report', 'Presentation', 'Source Code', 'Design Document', 'Other'];

/* ─── Stepper ─────────────────────────────────────────────────────── */
function Stepper({ activeStep, step1Done, step2Done }) {
  const items = [
    { n: 1, label: 'Phase',      done: step1Done },
    { n: 2, label: 'Submission', done: step2Done },
    { n: 3, label: 'Upload',     done: false },
  ];
  return (
    <div className="flex items-center gap-3">
      {items.map(({ n, label, done }, i) => {
        const active = activeStep === n;
        return (
          <div key={n} className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold transition-colors ${
                done ? 'bg-zinc-100 text-zinc-950'
                : active ? 'border border-[#3a3a40] bg-[#18181c] text-zinc-100'
                : 'border border-[#26262b] bg-[#0e0e10] text-zinc-600'
              }`}>
                {done ? <CheckCircle2 size={13} /> : n}
              </div>
              <span className={`text-[12.5px] font-medium tracking-tight ${
                done ? 'text-zinc-300' : active ? 'text-zinc-100' : 'text-zinc-600'
              }`}>
                {label}
              </span>
            </div>
            {i < items.length - 1 && (
              <div className={`h-px w-6 ${done ? 'bg-zinc-700' : 'bg-[#1c1c20]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── SectionPanel (numbered card) ────────────────────────────────── */
function SectionPanel({ step, title, locked, children }) {
  return (
    <section
      className={`rounded-2xl border p-5 transition-opacity duration-200 ${
        locked
          ? 'pointer-events-none border-[#1f1f23] bg-[#101013] opacity-50'
          : 'border-[#1f1f23] bg-[#131316]'
      }`}
    >
      <header className="mb-4 flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-md border border-[#26262b] bg-[#18181c] text-[11px] font-semibold tabular-nums text-zinc-300">
          {step}
        </span>
        <h2 className="text-[13px] font-semibold tracking-tight text-zinc-100">{title}</h2>
      </header>
      {children}
    </section>
  );
}

/* ─── Page ────────────────────────────────────────────────────────── */
export default function StudentSubmissionPage() {
  const fileInputRef = useRef(null);

  const [group, setGroup] = useState({ loading: true, id: '', error: '' });
  const [phases, setPhases] = useState([]);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState(TYPE_OPTIONS[0]);
  const [createErr, setCreateErr] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  useEffect(() => {
    apiClient.get(apiConfig.endpoints.auth.me)
      .then((r) => {
        const gid = r.data?.teamId || r.data?.groupId || '';
        if (!gid) setGroup({ loading: false, id: '', error: 'You are not assigned to a group yet.' });
        else setGroup({ loading: false, id: gid, error: '' });
      })
      .catch(() => setGroup({ loading: false, id: '', error: 'Failed to load your profile.' }));
  }, []);

  useEffect(() => {
    apiClient.get(apiConfig.endpoints.phases)
      .then((r) => setPhases(Array.isArray(r.data) ? r.data : []))
      .catch(() => setPhases([]));
  }, []);

  useEffect(() => {
    if (!selectedPhase || !group.id) { setSubmissions([]); setSelectedSub(null); return; }
    setSubsLoading(true);
    setSelectedSub(null);
    setSubmissions([]);
    setCreating(false);
    apiClient.get(`${apiConfig.endpoints.submissions.list}?groupId=${group.id}`)
      .then((r) => {
        const all = Array.isArray(r.data) ? r.data
          : Array.isArray(r.data?.data) ? r.data.data
          : Array.isArray(r.data?.items) ? r.data.items : [];
        const phaseId = selectedPhase._id || selectedPhase.phaseId || selectedPhase.id;
        setSubmissions(all.filter((s) => s.phaseId === phaseId));
      })
      .catch(() => setSubmissions([]))
      .finally(() => setSubsLoading(false));
  }, [selectedPhase, group.id]);

  const handleCreate = async () => {
    if (!newTitle.trim()) { setCreateErr('Please enter a title.'); return; }
    setCreateLoading(true); setCreateErr('');
    try {
      const phaseId = selectedPhase._id || selectedPhase.phaseId || selectedPhase.id;
      const res = await apiClient.post(apiConfig.endpoints.submissions.list, {
        title: newTitle.trim(),
        type: newType,
        phaseId,
        groupId: group.id,
      });
      const created = res.data;
      setSubmissions((prev) => [...prev, created]);
      setSelectedSub(created);
      setCreating(false);
      setNewTitle('');
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to create.';
      setCreateErr(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally { setCreateLoading(false); }
  };

  const handleUpload = async () => {
    if (!file || !selectedSub) return;
    setUploading(true); setUploadResult(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await apiClient.post(
        apiConfig.endpoints.submissionDocuments(getId(selectedSub)),
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      const name = res.data?.document?.originalName || file.name;
      setUploadResult({ ok: true, message: `"${name}" uploaded successfully.` });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Upload failed.';
      setUploadResult({ ok: false, message: Array.isArray(msg) ? msg.join(', ') : msg });
    } finally { setUploading(false); }
  };

  const step1Done = !!selectedPhase;
  const step2Done = !!selectedSub;
  const activeStep = !step1Done ? 1 : !step2Done ? 2 : 3;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Student"
        title="My Documents"
        subtitle="Submit deliverables to your project phases."
      />

      {/* Stepper bar */}
      <div className="mb-6 rounded-2xl border border-[#1f1f23] bg-[#0e0e10] px-5 py-4">
        <Stepper activeStep={activeStep} step1Done={step1Done} step2Done={step2Done} />
      </div>

      {group.error && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-rose-900/40 bg-rose-950/20 p-3.5 text-[13px] text-rose-300">
          <AlertCircle size={14} className="mt-px shrink-0" />
          <span>{group.error}</span>
        </div>
      )}

      <div className="space-y-4">

        {/* STEP 1 — Phase */}
        <SectionPanel step={1} title="Choose phase">
          {phases.length === 0 ? (
            <p className="text-[13px] text-zinc-500">No phases available yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {phases.map((p) => {
                const pid = p._id || p.phaseId || p.id;
                const isSelected = (selectedPhase?._id || selectedPhase?.phaseId || selectedPhase?.id) === pid;
                return (
                  <button
                    key={pid}
                    onClick={() => { setSelectedPhase(p); setSelectedSub(null); setUploadResult(null); setFile(null); }}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-[13px] transition-all duration-150 ${
                      isSelected
                        ? 'border-zinc-300 bg-zinc-100 text-zinc-950'
                        : 'border-[#26262b] bg-[#18181c] text-zinc-300 hover:border-[#3a3a40] hover:bg-[#1f1f23] hover:text-zinc-100'
                    }`}
                  >
                    <span className="font-medium">{p.name || pid}</span>
                    {isSelected && <CheckCircle2 size={15} className="shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </SectionPanel>

        {/* STEP 2 — Submission */}
        <SectionPanel step={2} title="Choose submission" locked={!step1Done}>
          {subsLoading ? (
            <div className="flex items-center gap-2 text-[13px] text-zinc-500">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : (
            <>
              {submissions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-600">Existing</p>
                  <div className="grid grid-cols-1 gap-2">
                    {submissions.map((s) => {
                      const sid = getId(s);
                      const isSelected = getId(selectedSub) === sid;
                      return (
                        <button
                          key={sid}
                          onClick={() => { setSelectedSub(s); setCreating(false); setUploadResult(null); setFile(null); }}
                          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-all duration-150 ${
                            isSelected
                              ? 'border-zinc-300 bg-zinc-100 text-zinc-950'
                              : 'border-[#26262b] bg-[#18181c] text-zinc-300 hover:border-[#3a3a40] hover:bg-[#1f1f23] hover:text-zinc-100'
                          }`}
                        >
                          <div>
                            <p className="text-[13px] font-medium">{s.title || 'Untitled'}</p>
                            <p className={`mt-0.5 text-[11px] ${isSelected ? 'text-zinc-700' : 'text-zinc-500'}`}>
                              {s.type} · {s.status || 'Draft'}
                            </p>
                          </div>
                          {isSelected && <CheckCircle2 size={15} className="shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {!creating ? (
                <button
                  onClick={() => { setCreating(true); setSelectedSub(null); }}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#2a2a30] bg-transparent py-3 text-[13px] font-medium text-zinc-500 transition hover:border-[#3a3a40] hover:bg-[#0e0e10] hover:text-zinc-200"
                >
                  <Plus size={14} /> Create new submission
                </button>
              ) : (
                <div className="mt-3 space-y-3 rounded-lg border border-[#26262b] bg-[#0e0e10] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">New submission</p>
                    <button onClick={() => setCreating(false)} className="rounded p-1 text-zinc-600 transition-colors hover:bg-[#18181c] hover:text-zinc-300">
                      <X size={13} />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Final Report"
                      value={newTitle}
                      onChange={(e) => { setNewTitle(e.target.value); setCreateErr(''); }}
                      className="w-full rounded-md border border-[#26262b] bg-[#0a0a0b] px-3 py-2 text-[13px] text-zinc-200 placeholder-zinc-700 transition focus:border-[#3a3a40] focus:outline-none focus:ring-1 focus:ring-[#3a3a40]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Type</label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      className="w-full rounded-md border border-[#26262b] bg-[#0a0a0b] px-3 py-2 text-[13px] text-zinc-200 transition focus:border-[#3a3a40] focus:outline-none focus:ring-1 focus:ring-[#3a3a40]"
                    >
                      {TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  {createErr && (
                    <p className="flex items-center gap-1.5 text-[12px] text-rose-400">
                      <AlertCircle size={12} /> {createErr}
                    </p>
                  )}
                  <button
                    onClick={handleCreate}
                    disabled={createLoading}
                    className="w-full rounded-md bg-zinc-100 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#26262b] disabled:text-zinc-600"
                  >
                    {createLoading ? 'Creating…' : 'Create submission'}
                  </button>
                </div>
              )}
            </>
          )}
        </SectionPanel>

        {/* STEP 3 — Upload */}
        <SectionPanel step={3} title="Upload file" locked={!step2Done}>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) { setFile(f); setUploadResult(null); }
            }}
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-xl py-12 text-center transition-all duration-200"
            style={{
              border: `1.5px dashed ${dragging ? '#52525b' : file ? 'rgba(52, 211, 153, 0.4)' : '#26262b'}`,
              background: dragging ? '#18181c' : file ? 'rgba(16, 185, 129, 0.04)' : '#0a0a0b',
            }}
          >
            {file ? (
              <div className="flex flex-col items-center gap-2.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-900/40 bg-emerald-950/20 text-emerald-400">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-zinc-200">{file.name}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-600 tabular-nums">{Math.round(file.size / 1024)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="mt-1 inline-flex items-center gap-1 rounded-md border border-[#26262b] bg-[#18181c] px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition hover:border-rose-900/50 hover:text-rose-400"
                >
                  <X size={11} /> Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#26262b] bg-[#18181c] text-zinc-500">
                  <Upload size={18} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-zinc-300">
                    Drop file or <span className="text-zinc-100">browse</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-600">PDF, DOC, DOCX, PNG, JPG · max 5 MB</p>
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setUploadResult(null); } }}
          />

          {uploadResult && (
            <div
              className={`mt-3 flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-[12.5px] ${
                uploadResult.ok
                  ? 'border-emerald-900/40 bg-emerald-950/20 text-emerald-300'
                  : 'border-rose-900/40 bg-rose-950/20 text-rose-300'
              }`}
            >
              {uploadResult.ok ? <CheckCircle2 size={13} className="mt-px shrink-0" /> : <X size={13} className="mt-px shrink-0" />}
              {uploadResult.message}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading || !step2Done}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-100 py-2.5 text-[13px] font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#26262b] disabled:text-zinc-600"
          >
            {uploading ? (
              <><Loader2 size={14} className="animate-spin" /> Uploading…</>
            ) : (
              <><Upload size={14} /> Upload document</>
            )}
          </button>
        </SectionPanel>
      </div>
    </div>
  );
}
