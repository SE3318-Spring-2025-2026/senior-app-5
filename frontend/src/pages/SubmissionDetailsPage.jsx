import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, ChevronLeft, Download } from 'lucide-react';
import apiClient from '../utils/apiClient';
import { Badge, Button, PageHeader } from '../components/ui';

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

  useEffect(() => {
    const localUser = localStorage.getItem('user');
    if (!localUser) {
      setStatus({ loading: false, error: 'You must be logged in to view this page.' });
      return;
    }

    const fetchSubmissionDetails = async () => {
      try {
        const response = await apiClient.get(`/submissions/${id}`);
        setSubmission(response.data);
        setStatus({ loading: false, error: '' });
      } catch (error) {
        console.error("Fetch error:", error);
        if (error.response?.status === 403) {
          setStatus({ loading: false, error: 'You do not have permission to view this submission.' });
        } else {
          setStatus({ loading: false, error: 'Failed to load submission details.' });
        }
      }
    };

    fetchSubmissionDetails();
  }, [id]);

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

      <PageHeader title="Submission Details" subtitle={submission.title} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* General Information */}
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

        {/* Attached Documents */}
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
    </div>
  );
};

export default SubmissionDetailsPage;
