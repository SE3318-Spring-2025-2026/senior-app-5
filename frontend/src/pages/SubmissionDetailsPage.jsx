import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, ChevronLeft, Download, FileEdit, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import { Badge, Button, PageHeader } from '../components/ui';

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const currentUserId = (user) =>
  String(user?.userId ?? user?.id ?? user?._id ?? '');

const statusColor = (status) => {
  if (!status) return 'slate';
  const s = status.toLowerCase().replace(/\s+/g, '');
  if (s === 'approved') return 'green';
  if (s === 'rejected') return 'red';
  if (s === 'underreview' || s === 'pending' || s === 'needsrevision') return 'yellow';
  return 'slate';
};

const SubmissionDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: '' });
  const [gradeInput, setGradeInput] = useState('');
  const [gradeSaving, setGradeSaving] = useState(false);

  const user = getStoredUser();
  const isProfessor = user?.role === 'Professor';
  const myUserId = currentUserId(user);

  const loadSubmission = useCallback(async () => {
    const response = await apiClient.get(apiConfig.endpoints.submissions.byId(id));
    const data = response.data;
    setSubmission(data);
    const uid = currentUserId(getStoredUser());
    const grades = data?.grades;
    const mine = Array.isArray(grades)
      ? grades.find((g) => String(g.graderUserId) === uid)
      : null;
    if (mine && mine.gradeValue != null) {
      setGradeInput(String(mine.gradeValue));
    } else {
      setGradeInput('');
    }
  }, [id]);

  useEffect(() => {
    if (!getStoredUser()) {
      setStatus({ loading: false, error: 'You must be logged in to view this page.' });
      return;
    }

    const fetchSubmissionDetails = async () => {
      try {
        await loadSubmission();
        setStatus({ loading: false, error: '' });
      } catch (error) {
        console.error('Fetch error:', error);
        if (error.response?.status === 403) {
          setStatus({ loading: false, error: 'You do not have permission to view this submission.' });
        } else {
          setStatus({ loading: false, error: 'Failed to load submission details.' });
        }
      }
    };

    fetchSubmissionDetails();
  }, [id, loadSubmission]);

  const handleSubmitGrade = async (e) => {
    e.preventDefault();
    if (!submission?._id) return;
    const n = Number(gradeInput);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      toast.error('Enter a grade between 0 and 100.');
      return;
    }
    setGradeSaving(true);
    try {
      const res = await apiClient.post(
        apiConfig.endpoints.submissions.grades(submission._id),
        { gradeValue: n },
      );
      const data = res.data;
      setSubmission((prev) =>
        prev ? { ...prev, grades: data.allGrades ?? prev.grades } : prev,
      );
      toast.success(res.status === 201 ? 'Grade submitted.' : 'Grade updated.');
    } catch (err) {
      const raw = err.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join(', ') : raw || err.message || 'Could not save grade.';
      toast.error(typeof msg === 'string' ? msg : 'Could not save grade.');
    } finally {
      setGradeSaving(false);
    }
  };

  const gradesList = Array.isArray(submission?.grades) ? submission.grades : [];

  if (status.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-slate-500 text-sm">Loading details...</span>
      </div>
    );
  }

  if (status.error) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {status.error}
        </div>
        <button
          onClick={() => navigate('/login')}
          className="rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm font-bold text-slate-300 hover:border-slate-600 hover:text-slate-100"
        >
          Go to Login
        </button>
      </div>
    );
  }

  if (!submission) return null;

  return (
    <div>
      <button
        onClick={() => navigate('/documents')}
        className="mb-4 flex items-center gap-1.5 rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm font-bold text-slate-300 hover:border-slate-600 hover:text-slate-100"
      >
        <ChevronLeft size={16} />
        Back to List
      </button>

      <PageHeader
        title="Submission Details"
        subtitle={submission.title}
        actions={
          <Button
            variant="ghost"
            size="md"
            onClick={() => navigate(`/documents/${submission._id}/markdown`)}
          >
            <FileEdit size={14} />
            Open markdown editor
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111827] rounded-2xl border border-[#1e293b] p-5">
          <h3 className="text-sm font-bold text-slate-200 mb-4">General Information</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="text-slate-500 shrink-0">Type:</dt>
              <dd className="text-slate-200">{submission.type ?? '—'}</dd>
            </div>
            <div className="flex gap-2 items-center">
              <dt className="text-slate-500 shrink-0">Status:</dt>
              <dd>
                <Badge color={statusColor(submission.status)}>
                  {submission.status}
                </Badge>
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-500 shrink-0">Group ID:</dt>
              <dd className="text-slate-200">{submission.groupId}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-500 shrink-0">Submitted On:</dt>
              <dd className="text-slate-200">
                {new Date(submission.submittedAt || submission.createdAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-[#111827] rounded-2xl border border-[#1e293b] p-5">
          <h3 className="text-sm font-bold text-slate-200 mb-4">Attached Documents</h3>

          {!submission.documents || submission.documents.length === 0 ? (
            <p className="text-sm text-slate-500">No files have been uploaded yet.</p>
          ) : (
            <ul className="divide-y divide-[#1e293b]">
              {submission.documents.map((doc, index) => (
                <li key={index} className="flex items-center justify-between py-2">
                  <span className="flex items-center gap-2 text-sm text-slate-300">
                    <FileText size={14} className="text-slate-500 shrink-0" />
                    {doc.originalName}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </span>
                    <button
                      className="flex items-center gap-1.5 rounded-lg border border-[#1e293b] bg-[#0d1526] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-600 hover:text-slate-100 transition-colors"
                      onClick={async () => {
                        try {
                          const resp = await apiClient.get(
                            `/submissions/${submission._id}/documents/${index}`,
                            { responseType: 'blob' },
                          );
                          const url = URL.createObjectURL(resp.data);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = doc.originalName;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch (err) {
                          alert('Download failed: ' + (err.response?.data?.message || err.message));
                        }
                      }}
                    >
                      <Download size={12} />
                      Download
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 bg-[#111827] rounded-2xl border border-[#1e293b] p-5">
        <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
          <ClipboardList size={16} className="text-slate-400" />
          Jury grades
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Each committee jury member may submit a numeric grade (0–100). Your grade updates the existing
          entry if you submit again.
        </p>

        {gradesList.length === 0 ? (
          <p className="text-sm text-slate-500">No jury grades recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#1e293b]">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-[#1e293b] text-slate-500 text-xs uppercase tracking-wide">
                  <th className="px-3 py-2 font-semibold">Grader</th>
                  <th className="px-3 py-2 font-semibold">Grade</th>
                  <th className="px-3 py-2 font-semibold">Graded at</th>
                </tr>
              </thead>
              <tbody>
                {gradesList.map((g) => (
                  <tr
                    key={g.gradeId || `${g.graderUserId}-${g.gradedAt}`}
                    className={
                      String(g.graderUserId) === myUserId
                        ? 'bg-emerald-500/10 border-t border-[#1e293b]'
                        : 'border-t border-[#1e293b]'
                    }
                  >
                    <td className="px-3 py-2 text-slate-300 font-mono text-xs">
                      {g.graderUserId}
                      {String(g.graderUserId) === myUserId ? (
                        <span className="ml-2 text-emerald-400 font-sans text-[11px]">(you)</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-slate-200 font-semibold">{g.gradeValue}</td>
                    <td className="px-3 py-2 text-slate-400">
                      {g.gradedAt ? new Date(g.gradedAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isProfessor ? (
          <form onSubmit={handleSubmitGrade} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="jury-grade-value" className="text-xs font-semibold text-slate-400">
                Your grade (0–100)
              </label>
              <input
                id="jury-grade-value"
                type="number"
                min={0}
                max={100}
                step={1}
                value={gradeInput}
                onChange={(ev) => setGradeInput(ev.target.value)}
                className="w-28 rounded-lg border border-[#1e293b] bg-[#0d1526] px-3 py-2 text-sm text-slate-200 focus:border-slate-500 focus:outline-none"
                disabled={gradeSaving}
              />
            </div>
            <Button type="submit" disabled={gradeSaving}>
              {gradeSaving ? 'Saving…' : 'Save grade'}
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
};

export default SubmissionDetailsPage;