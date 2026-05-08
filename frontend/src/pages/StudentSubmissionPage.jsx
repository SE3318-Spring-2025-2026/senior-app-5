import { useRef, useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, ChevronRight, X, Loader2 } from 'lucide-react';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';

/* ─── helpers ─────────────────────────────────────────────── */
const getId = (s) => s?._id || s?.id || s?.submissionId || '';
const TYPE_OPTIONS = ['Report', 'Presentation', 'Source Code', 'Design Document', 'Other'];

function Step({ number, title, active, done }) {
  return (
    <div className={`flex items-center gap-3 ${active ? 'opacity-100' : done ? 'opacity-80' : 'opacity-40'}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold
        ${done ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
               : active ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400'
               : 'border-slate-700 bg-transparent text-slate-500'}`}>
        {done ? <CheckCircle size={16} /> : number}
      </div>
      <span className={`text-sm font-semibold ${active ? 'text-slate-100' : done ? 'text-emerald-400' : 'text-slate-500'}`}>
        {title}
      </span>
    </div>
  );
}

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
        const filtered = all.filter((s) => s.phaseId === phaseId);
        setSubmissions(filtered);
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
      setUploadResult({ ok: true, message: `"${name}" uploaded successfully!` });
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
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-100">Submit Document</h1>
        <p className="text-sm text-slate-400">Upload files for your project phase.</p>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-[#1e293b] bg-[#111827] px-5 py-4">
        <Step number={1} title="Select Phase" active={activeStep === 1} done={step1Done} />
        <ChevronRight size={14} className="text-slate-600 shrink-0" />
        <Step number={2} title="Select Submission" active={activeStep === 2} done={step2Done} />
        <ChevronRight size={14} className="text-slate-600 shrink-0" />
        <Step number={3} title="Upload File" active={activeStep === 3} done={false} />
      </div>

      {group.error && (
        <div className="rounded-xl border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {group.error}
        </div>
      )}

      {/* STEP 1 */}
      <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Step 1 · Phase</p>
        {phases.length === 0 ? (
          <p className="text-sm text-slate-500">No phases available yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {phases.map((p) => {
              const pid = p._id || p.phaseId || p.id;
              const isSelected = (selectedPhase?._id || selectedPhase?.phaseId || selectedPhase?.id) === pid;
              return (
                <button key={pid} onClick={() => { setSelectedPhase(p); setSelectedSub(null); setUploadResult(null); setFile(null); }}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors
                    ${isSelected ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-300'
                      : 'border-[#1e293b] bg-[#0d1526] text-slate-300 hover:border-slate-600 hover:text-slate-100'}`}>
                  <span className="text-sm font-medium">{p.name || pid}</span>
                  {isSelected && <CheckCircle size={16} className="text-indigo-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* STEP 2 */}
      <div className={`rounded-xl border border-[#1e293b] bg-[#111827] p-5 space-y-4 transition-opacity ${step1Done ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Step 2 · Submission</p>
        {subsLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" /> Loading…</div>
        ) : (
          <>
            {submissions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Choose an existing submission:</p>
                <div className="grid grid-cols-1 gap-2">
                  {submissions.map((s) => {
                    const sid = getId(s);
                    const isSelected = getId(selectedSub) === sid;
                    return (
                      <button key={sid} onClick={() => { setSelectedSub(s); setCreating(false); setUploadResult(null); setFile(null); }}
                        className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors
                          ${isSelected ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-300'
                            : 'border-[#1e293b] bg-[#0d1526] text-slate-300 hover:border-slate-600 hover:text-slate-100'}`}>
                        <div>
                          <p className="text-sm font-medium">{s.title || 'Untitled'}</p>
                          <p className="text-xs text-slate-500">{s.type} · {s.status || 'draft'}</p>
                        </div>
                        {isSelected && <CheckCircle size={16} className="text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {!creating ? (
              <button onClick={() => { setCreating(true); setSelectedSub(null); }}
                className="w-full rounded-lg border border-dashed border-slate-600 bg-transparent py-3 text-sm font-medium text-slate-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors">
                + Create new submission
              </button>
            ) : (
              <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-indigo-400">New Submission</p>
                  <button onClick={() => setCreating(false)} className="text-slate-500 hover:text-slate-300"><X size={14} /></button>
                </div>
                <input type="text" placeholder="Title (e.g. Final Report)" value={newTitle}
                  onChange={(e) => { setNewTitle(e.target.value); setCreateErr(''); }}
                  className="w-full rounded-lg border border-[#1e293b] bg-[#0d1526] px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none" />
                <select value={newType} onChange={(e) => setNewType(e.target.value)}
                  className="w-full rounded-lg border border-[#1e293b] bg-[#0d1526] px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none">
                  {TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                </select>
                {createErr && <p className="text-xs text-red-400">{createErr}</p>}
                <button onClick={handleCreate} disabled={createLoading}
                  className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                  {createLoading ? 'Creating…' : 'Create'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* STEP 3 */}
      <div className={`rounded-xl border border-[#1e293b] bg-[#111827] p-5 space-y-4 transition-opacity ${step2Done ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Step 3 · Upload File</p>
        <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) { setFile(f); setUploadResult(null); } }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 transition-colors
            ${dragging ? 'border-indigo-500 bg-indigo-500/10' : file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-700 bg-[#0d1526] hover:border-slate-600'}`}>
          {file ? (
            <div className="flex flex-col items-center gap-2 text-center">
              <FileText size={32} className="text-emerald-400" />
              <p className="text-sm font-semibold text-slate-200">{file.name}</p>
              <p className="text-xs text-slate-500">{Math.round(file.size / 1024)} KB</p>
              <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="mt-1 flex items-center gap-1 rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-400 hover:text-slate-200">
                <X size={12} /> Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center">
              <Upload size={28} className="text-slate-500" />
              <p className="text-sm font-medium text-slate-300">Drag &amp; drop or <span className="text-indigo-400">click to browse</span></p>
              <p className="text-xs text-slate-500">PDF, DOC, DOCX, PNG, JPG — max 5 MB</p>
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setUploadResult(null); } }} />
        {uploadResult && (
          <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm
            ${uploadResult.ok ? 'border-emerald-800/50 bg-emerald-900/20 text-emerald-400' : 'border-red-800/50 bg-red-900/20 text-red-400'}`}>
            {uploadResult.ok ? <CheckCircle size={16} /> : <X size={16} />}
            {uploadResult.message}
          </div>
        )}
        <button onClick={handleUpload} disabled={!file || uploading || !step2Done}
          className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 transition-colors">
          {uploading ? (<span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Uploading…</span>) : 'Upload Document'}
        </button>
      </div>
    </div>
  );
}
