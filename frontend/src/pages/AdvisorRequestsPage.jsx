import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, UserCheck, XCircle, CheckCircle2 } from 'lucide-react';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import { Badge, Button, PageHeader } from '../components/ui';

const STATUS_OPTIONS = ['', 'PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'];
const STATUS_LABELS = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn' };

const statusBadgeColor = { PENDING: 'yellow', APPROVED: 'green', REJECTED: 'red', WITHDRAWN: 'slate' };

const getApiError = (error) => {
  const msg = error?.response?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg || error.message || 'Unexpected error.';
};

function AdvisorRequestsPage() {
  const [requests, setRequests]       = useState([]);
  const [statusFilter, setFilter]     = useState('');
  const [loading, setLoading]         = useState(false);
  const [fetchError, setFetchError]   = useState('');
  const [actionMsg, setActionMsg]     = useState({ text: '', isError: false });
  const [modal, setModal]             = useState(null);
  const [actionLoading, setActLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await apiClient.get(apiConfig.endpoints.requests, { params });
      const list = res.data?.data || res.data?.items || res.data || [];
      setRequests(Array.isArray(list) ? list : []);
    } catch (err) {
      setFetchError(getApiError(err));
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const openModal = (request, decision) => {
    setActionMsg({ text: '', isError: false });
    setModal({ request, decision });
  };

  const handleDecision = async () => {
    if (!modal) return;
    const { request, decision } = modal;
    const requestId = request.requestId || request.id;
    setActLoading(true);
    try {
      await apiClient.patch(apiConfig.endpoints.requestDecision(requestId), { decision });
      setActionMsg({ text: `Request ${decision === 'APPROVE' ? 'approved' : 'rejected'} successfully.`, isError: false });
      setModal(null);
      await fetchRequests();
    } catch (err) {
      setActionMsg({ text: getApiError(err), isError: true });
    } finally {
      setActLoading(false);
    }
  };

  const pendingCount = requests.filter((r) => String(r.status || '').toUpperCase() === 'PENDING').length;

  return (
    <div>
      <PageHeader
        title="Advisee Requests"
        subtitle="Review and respond to team advisee requests. Approving assigns the group to you."
        actions={
          <Button variant="ghost" size="sm" loading={loading} onClick={fetchRequests}>
            <RefreshCw size={14} />
            Refresh
          </Button>
        }
      />

      {actionMsg.text && (
        <div
          role="status"
          className={[
            'mb-4 flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium',
            actionMsg.isError
              ? 'border-red-500/30 bg-red-500/10 text-red-400'
              : 'border-green-500/30 bg-green-500/10 text-green-400',
          ].join(' ')}
        >
          {actionMsg.isError ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
          {actionMsg.text}
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Status</label>
        <select
          value={statusFilter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200
                     focus:outline-none focus:ring-2 focus:ring-blue-600/60"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === '' ? 'All Statuses' : STATUS_LABELS[s] || s}</option>
          ))}
        </select>
      </div>

      {fetchError && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {fetchError}
        </div>
      )}

      {pendingCount > 0 && (
        <p className="mb-3 text-sm font-medium text-yellow-400">
          {pendingCount} pending {pendingCount === 1 ? 'request' : 'requests'} awaiting your decision.
        </p>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[#1e293b]">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <UserCheck size={32} className="text-slate-700" />
            <p className="text-sm font-medium text-slate-500">
              {statusFilter ? `No ${statusFilter.toLowerCase()} requests.` : 'No requests yet.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#080f1f]">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Group</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Submitted By</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Date</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => {
                const id = req.requestId || req.id;
                const isPending = String(req.status || '').toUpperCase() === 'PENDING';
                const statusKey = String(req.status || '').toUpperCase();
                const date = req.createdAt || req.submittedAt;
                return (
                  <tr key={id} className="border-t border-[#1e293b] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-200">
                      {req.groupName || req.groupId || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {req.submittedByEmail || req.submittedBy || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={statusBadgeColor[statusKey] ?? 'slate'}>
                        {STATUS_LABELS[statusKey] || statusKey || 'Unknown'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {isPending && (
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openModal(req, 'APPROVE')}
                            className="!text-green-400 !border-green-500/30 hover:!bg-green-500/10">
                            Approve
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => openModal(req, 'REJECT')}>
                            Reject
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirm modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#1e293b] bg-[#0d1729] p-6 shadow-2xl">
            <h3 className="mb-1 text-base font-bold text-slate-100">
              {modal.decision === 'APPROVE' ? 'Approve Request' : 'Reject Request'}
            </h3>
            <p className="mb-1 text-sm text-slate-400">
              {modal.decision === 'APPROVE'
                ? 'Approving will assign this group to you. All other pending requests for this group will be automatically rejected.'
                : 'Are you sure you want to reject this request?'}
            </p>
            <p className="mb-5 text-sm text-slate-500">
              Group:{' '}
              <span className="font-semibold text-slate-300">
                {modal.request.groupName || modal.request.groupId}
              </span>
            </p>

            {actionMsg.isError && actionMsg.text && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {actionMsg.text}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="md" disabled={actionLoading} onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button
                variant={modal.decision === 'APPROVE' ? 'primary' : 'danger'}
                size="md"
                loading={actionLoading}
                onClick={handleDecision}
              >
                {modal.decision === 'APPROVE' ? 'Confirm Approve' : 'Confirm Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdvisorRequestsPage;
