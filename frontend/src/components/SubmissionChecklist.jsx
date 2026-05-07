import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, ClipboardList } from 'lucide-react';
import apiClient from '../utils/apiClient';
import { Card } from './ui';

const SubmissionChecklist = () => {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchCompleteness = async () => {
      try {
        const userStr = localStorage.getItem('user');
        const localUser = userStr ? JSON.parse(userStr) : null;

        if (!localUser) {
          setError('User session not found.');
          setLoading(false);
          return;
        }

        const groupId = localUser.teamId || localUser.groupId;
        if (!groupId) {
          setError('You are not assigned to any group yet.');
          setLoading(false);
          return;
        }

        const subRes = await apiClient.get(`/submissions?groupId=${groupId}`, { signal });
        const submissions = subRes.data;

        if (!submissions || submissions.length === 0) {
          setError('No active submissions found to track.');
          setLoading(false);
          return;
        }

        const latestSubmissionId = submissions[0]._id;
        const completenessRes = await apiClient.get(
          `/submissions/${latestSubmissionId}/completeness`,
          { signal },
        );

        const required = completenessRes.data.requiredFields || [];
        const missing = completenessRes.data.missingFields || [];

        setRequirements(
          required.map((field) => ({
            name: field.charAt(0).toUpperCase() + field.slice(1),
            isComplete: !missing.includes(field),
          })),
        );
        setLoading(false);
      } catch (err) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        setError('Failed to load checklist data from the server.');
        setLoading(false);
      }
    };

    fetchCompleteness();
    return () => controller.abort();
  }, []);

  return (
    <Card>
      <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
        <ClipboardList size={13} />
        Phase Submission Checklist
      </p>

      {loading ? (
        <p className="text-sm text-slate-500">Loading requirements…</p>
      ) : error ? (
        <p className="text-sm text-slate-500">{error}</p>
      ) : requirements.length === 0 ? (
        <p className="text-sm text-slate-500">No specific requirements found for this phase.</p>
      ) : (
        <ul className="space-y-2">
          {requirements.map((req) => (
            <li
              key={req.name}
              className="flex items-center justify-between rounded-lg px-3 py-2 bg-white/[0.02]"
            >
              <div className="flex items-center gap-2.5">
                {req.isComplete ? (
                  <CheckCircle2 size={15} className="shrink-0 text-green-400" />
                ) : (
                  <Clock size={15} className="shrink-0 text-yellow-400" />
                )}
                <span className={`text-sm ${req.isComplete ? 'text-slate-400 line-through' : 'text-slate-300'}`}>
                  {req.name}
                </span>
              </div>
              <span
                className={[
                  'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                  req.isComplete
                    ? 'border-green-500/30 bg-green-500/10 text-green-400'
                    : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
                ].join(' ')}
              >
                {req.isComplete ? 'Complete' : 'Pending'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default SubmissionChecklist;
