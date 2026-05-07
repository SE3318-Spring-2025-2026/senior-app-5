import { useEffect, useMemo, useState } from 'react';
import { Users, Mail, MessageSquare, AlertCircle } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import apiConfig from '../../config/api';
import { getReview } from '../../utils/reviewService';
import SubmissionChecklist from '../SubmissionChecklist';
import { Card } from '../ui';

function StatCard({ icon: Icon, label, value, iconColor = 'text-blue-400' }) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 ${iconColor}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
        <p className="mt-0.5 text-lg font-bold text-slate-100">{value}</p>
      </div>
    </Card>
  );
}

const StudentView = ({ user }) => {
  const [feedbackState, setFeedbackState] = useState({ loading: true, error: '' });
  const [reviews, setReviews] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const update = () => setCurrentTime(Date.now());
    update();
    const timer = window.setInterval(update, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const load = async () => {
      const groupId = user?.teamId || user?.groupId;
      if (!groupId) {
        setFeedbackState({ loading: false, error: 'No active group found.' });
        return;
      }
      try {
        setFeedbackState({ loading: true, error: '' });
        const res = await apiClient.get(apiConfig.endpoints.submissions.byGroup(groupId));
        const submissions = Array.isArray(res.data) ? res.data : res.data?.data || [];
        const active =
          submissions.find((s) => ['UnderReview', 'NeedsRevision', 'Pending'].includes(s.status)) ||
          submissions[0];

        if (!active) { setReviews([]); setFeedbackState({ loading: false, error: '' }); return; }

        const embedded = Array.isArray(active.reviews) ? active.reviews : [];
        const ids = [active.reviewId, ...(Array.isArray(active.reviewIds) ? active.reviewIds : [])].filter(Boolean);
        const loaded = ids.length ? await Promise.all(ids.map(getReview)) : embedded;
        setReviews(loaded);
        setFeedbackState({ loading: false, error: '' });
      } catch (err) {
        setReviews([]);
        setFeedbackState({ loading: false, error: err.message || 'Unable to load feedback.' });
      }
    };
    load();
  }, [user]);

  const comments = useMemo(() => reviews.flatMap((r) => r?.comments || []), [reviews]);
  const revisionRequests = useMemo(
    () =>
      reviews
        .flatMap((r) => r?.revisionRequests || [])
        .filter((req) => !['Resolved', 'Closed', 'Completed'].includes(req.status)),
    [reviews],
  );

  const formatDate = (v) => {
    if (!v) return 'No due date';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? 'No due date' : d.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard icon={Users} label="My Group" value="1 Active" iconColor="text-blue-400" />
        <StatCard icon={Mail} label="Pending Invites" value="3 New" iconColor="text-yellow-400" />
      </div>

      <SubmissionChecklist />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <MessageSquare size={13} /> Feedback
          </p>
          {feedbackState.loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : feedbackState.error ? (
            <p className="text-sm text-red-400">{feedbackState.error}</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-slate-500">No feedback posted yet.</p>
          ) : (
            <ul className="space-y-3">
              {comments.map((c, i) => (
                <li key={c.id || c._id || i} className="text-sm text-slate-300">
                  <span className="font-semibold text-slate-200">
                    {c.authorName || c.author?.name || 'Reviewer'}:
                  </span>{' '}
                  {c.text}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <AlertCircle size={13} /> Revision Requests
          </p>
          {feedbackState.loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : revisionRequests.length === 0 ? (
            <p className="text-sm text-slate-500">No active revision requests.</p>
          ) : (
            <ul className="space-y-3">
              {revisionRequests.map((req, i) => {
                const past = req.dueDatetime && new Date(req.dueDatetime).getTime() < currentTime;
                return (
                  <li key={req.id || req._id || i} className="text-sm text-slate-300">
                    <p>{req.description}</p>
                    <p className={`mt-0.5 text-xs font-semibold ${past ? 'text-red-400' : 'text-slate-500'}`}>
                      Due {formatDate(req.dueDatetime)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

export default StudentView;
