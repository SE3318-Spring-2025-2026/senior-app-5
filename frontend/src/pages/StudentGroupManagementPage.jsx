import { useMemo, useState } from 'react';
import { Users, ClipboardList, Building2, BarChart2, XCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import EntitySearchSelect from '../components/EntitySearchSelect';
import { Badge, Button, Card, PageHeader } from '../components/ui';
import clsx from 'clsx';

const TEAM_LEADER_ROLES = new Set(['TeamLeader', 'TEAM_LEADER', 'Professor']);
const getApiError = (e) => {
  const s = e?.response?.status;
  const m = e?.response?.data?.message;
  return { status: s, message: (Array.isArray(m) ? m.join(', ') : m) || e.message || 'Unexpected error.' };
};

const submitMsgs = {
  400: 'Validation failed.',
  401: 'Session expired. Please log in again.',
  403: 'You are not authorised to submit advisor requests.',
  409: 'A conflicting request already exists for this group.',
  423: 'This group is blocked from submitting requests.',
  500: 'Server error. Please try again.',
};
const withdrawMsgs = {
  400: 'Withdraw validation failed.',
  401: 'Session expired.',
  403: 'Not authorised to withdraw.',
  404: 'Request not found.',
  409: 'Only pending requests can be withdrawn.',
  500: 'Server error.',
};
const lookupMsgs = { 401: 'Session expired.', 403: 'Not authorised.', 404: 'Not found.', 500: 'Server error.' };

const getRequestId     = (r) => r.requestId || r.id;
const getRequestStatus = (r) => String(r.status || '').toUpperCase();
const isPending        = (r) => getRequestStatus(r) === 'PENDING';

const statusColor = { PENDING: 'yellow', APPROVED: 'green', REJECTED: 'red', WITHDRAWN: 'slate' };

function Toast({ state }) {
  if (!state?.message && !state?.error) return null;
  const isErr = Boolean(state.error);
  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        'flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium mb-4',
        isErr
          ? 'border-red-500/30 bg-red-500/10 text-red-400'
          : 'border-green-500/30 bg-green-500/10 text-green-400',
      )}
    >
      {isErr ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
      {state.error || state.message}
    </div>
  );
}

const TABS = [
  { id: 'browse-advisors',   label: 'Browse Advisors',    icon: Users },
  { id: 'my-requests',       label: 'My Requests',         icon: ClipboardList },
  { id: 'committee-details', label: 'Committee Details',   icon: Building2 },
  { id: 'group-status',      label: 'Group Status',        icon: BarChart2 },
];

function StudentGroupManagementPage() {
  const userStr    = localStorage.getItem('user');
  const user       = userStr ? JSON.parse(userStr) : null;
  const isLeader   = TEAM_LEADER_ROLES.has(user?.role);

  const [activeTab, setTab] = useState('browse-advisors');

  const [advisors, setAdvisors]               = useState([]);
  const [advisorState, setAdvisorState]       = useState({ loading: false, message: '', error: '' });
  const [selectedAdvisorId, setSelAdvisor]    = useState('');
  const [advisorPage, setAdvisorPage]         = useState(1);
  const [advisorLimit, setAdvisorLimit]       = useState(10);
  const [groupId, setGroupId]                 = useState('');
  const [submitState, setSubmitState]         = useState({ loading: false, message: '', error: '' });

  const [requests, setRequests]               = useState([]);
  const [requestState, setRequestState]       = useState({ loading: false, message: '', error: '' });
  const [withdrawLoadingId, setWdlId]         = useState('');
  const [withdrawModal, setWdModal]           = useState(null);
  const [withdrawState, setWithdrawState]     = useState({ loading: false, message: '', error: '' });

  const [committeeGroupId, setCommGId]        = useState('');
  const [committeeResult, setCommResult]      = useState(null);
  const [committeeState, setCommState]        = useState({ loading: false, message: '', error: '' });

  const [statusGroupId, setStatusGId]         = useState('');
  const [groupStatusResult, setGsResult]      = useState(null);
  const [groupStatusState, setGsState]        = useState({ loading: false, message: '', error: '' });

  const selectedAdvisor = useMemo(
    () => advisors.find((a) => String(a.advisorId || a.id) === String(selectedAdvisorId)),
    [advisors, selectedAdvisorId],
  );

  const fetchAdvisors = async () => {
    setAdvisorState({ loading: true, message: '', error: '' });
    try {
      const res = await apiClient.get(apiConfig.endpoints.advisors, { params: { page: advisorPage, limit: advisorLimit } });
      const list = res.data?.data || res.data?.items || res.data || [];
      setAdvisors(Array.isArray(list) ? list : []);
      setAdvisorState({ loading: false, message: 'Advisor list loaded.', error: '' });
    } catch (e) {
      const { message } = getApiError(e);
      setAdvisors([]);
      setAdvisorState({ loading: false, message: '', error: message });
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setSubmitState({ loading: true, message: '', error: '' });
    try {
      await apiClient.post(apiConfig.endpoints.requests, { groupId, advisorId: selectedAdvisorId });
      setSubmitState({ loading: false, message: 'Advisor request submitted successfully.', error: '' });
      await fetchRequests();
    } catch (err) {
      const { status, message } = getApiError(err);
      setSubmitState({ loading: false, message: '', error: submitMsgs[status] || message });
    }
  };

  const fetchRequests = async () => {
    setRequestState({ loading: true, message: '', error: '' });
    try {
      const res = await apiClient.get(apiConfig.endpoints.requests);
      const list = res.data?.data || res.data?.items || res.data || [];
      setRequests(Array.isArray(list) ? list : []);
      setRequestState({ loading: false, message: '', error: '' });
    } catch (e) {
      const { message } = getApiError(e);
      setRequests([]);
      setRequestState({ loading: false, message: '', error: message });
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawModal) return;
    const requestId = getRequestId(withdrawModal);
    setWithdrawState({ loading: true, message: '', error: '' });
    setWdlId(String(requestId));
    try {
      await apiClient.patch(apiConfig.endpoints.requestById(requestId), { status: 'WITHDRAWN' });
      setWithdrawState({ loading: false, message: 'Request withdrawn.', error: '' });
      setWdModal(null);
      await fetchRequests();
    } catch (err) {
      const { status, message } = getApiError(err);
      setWithdrawState({ loading: false, message: '', error: withdrawMsgs[status] || message });
    } finally {
      setWdlId('');
    }
  };

  const handleCommitteeLookup = async (e) => {
    e.preventDefault();
    setCommState({ loading: true, message: '', error: '' });
    setCommResult(null);
    try {
      const res = await apiClient.get(apiConfig.endpoints.groupCommittee(committeeGroupId));
      setCommResult(res.data || null);
      setCommState({ loading: false, message: '', error: '' });
    } catch (err) {
      const { status, message } = getApiError(err);
      setCommState({ loading: false, message: '', error: lookupMsgs[status] || message });
    }
  };

  const handleGroupStatusLookup = async (e) => {
    e.preventDefault();
    setGsState({ loading: true, message: '', error: '' });
    setGsResult(null);
    try {
      const res = await apiClient.get(apiConfig.endpoints.groupStatus(statusGroupId));
      setGsResult(res.data || null);
      setGsState({ loading: false, message: '', error: '' });
    } catch (err) {
      const { status, message } = getApiError(err);
      setGsState({ loading: false, message: '', error: lookupMsgs[status] || message });
    }
  };

  const labelClass = 'block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5';
  const inputClass = 'w-full rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60 disabled:opacity-50';

  return (
    <div>
      <PageHeader
        title="Group Management Hub"
        subtitle="Manage advisor requests, track your status, and view committee details."
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-[#1e293b] bg-[#080f1f] p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors duration-150',
              activeTab === id
                ? 'bg-blue-600/15 text-blue-400'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5',
            )}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Browse Advisors ── */}
      {activeTab === 'browse-advisors' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <p className="mb-1 text-sm font-bold text-slate-200">Advisor List</p>
            <p className="mb-4 text-xs text-slate-500">Browse advisors and choose one before submitting.</p>
            <div className="mb-4 flex flex-wrap gap-3 items-end">
              <div>
                <label className={labelClass}>Page</label>
                <input type="number" min="1" value={advisorPage} onChange={(e) => setAdvisorPage(Number(e.target.value) || 1)}
                  className="w-20 rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60" />
              </div>
              <div>
                <label className={labelClass}>Limit</label>
                <input type="number" min="1" value={advisorLimit} onChange={(e) => setAdvisorLimit(Number(e.target.value) || 10)}
                  className="w-20 rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60" />
              </div>
              <Button variant="ghost" size="md" loading={advisorState.loading} onClick={fetchAdvisors}>
                <RefreshCw size={13} /> Load
              </Button>
            </div>
            <Toast state={advisorState} />
            {advisors.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No advisors loaded yet.</p>
            ) : (
              <ul className="space-y-1">
                {advisors.map((a) => {
                  const aid  = String(a.advisorId || a.id);
                  const name = a.name || a.fullName || a.email || `Advisor ${aid}`;
                  return (
                    <li key={aid}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5 transition-colors">
                        <input
                          type="radio"
                          name="advisor"
                          className="accent-blue-600"
                          checked={selectedAdvisorId === aid}
                          onChange={() => setSelAdvisor(aid)}
                        />
                        <span className="text-sm text-slate-300">{name}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <p className="mb-1 text-sm font-bold text-slate-200">Submit Advisor Request</p>
            <p className="mb-4 text-xs text-slate-500">
              {isLeader ? 'Finalise your selection and submit.' : 'Only the Team Leader can submit requests.'}
            </p>
            <form className="space-y-4" onSubmit={handleSubmitRequest}>
              <div>
                <label className={labelClass}>Group ID</label>
                <input className={inputClass} value={groupId} onChange={(e) => setGroupId(e.target.value)} required />
              </div>
              <div>
                <label className={labelClass}>Selected Advisor</label>
                <input
                  className={`${inputClass} opacity-60`}
                  value={selectedAdvisor ? (selectedAdvisor.name || selectedAdvisor.fullName || selectedAdvisorId) : ''}
                  disabled
                  placeholder="Select from list →"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!isLeader || !groupId || !selectedAdvisorId}
                loading={submitState.loading}
                className="w-full"
              >
                Submit Request
              </Button>
            </form>
            <Toast state={submitState} />
          </Card>
        </div>
      )}

      {/* ── My Requests ── */}
      {activeTab === 'my-requests' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-400">Your advisor requests and their current status.</p>
            <Button variant="ghost" size="sm" loading={requestState.loading} onClick={fetchRequests}>
              <RefreshCw size={13} /> Refresh
            </Button>
          </div>
          <Toast state={requestState} />
          <Toast state={withdrawState} />
          <div className="overflow-hidden rounded-2xl border border-[#1e293b]">
            {requests.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <ClipboardList size={32} className="text-slate-700" />
                <p className="text-sm text-slate-500">No requests found.</p>
                <Button variant="ghost" size="sm" onClick={fetchRequests}>Load Requests</Button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#080f1f]">
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Request ID</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Group</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Advisor</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => {
                    const rid     = getRequestId(r);
                    const pending = isPending(r);
                    const sKey    = getRequestStatus(r);
                    return (
                      <tr key={rid} className="border-t border-[#1e293b] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{rid}</td>
                        <td className="px-4 py-3 text-slate-300">{r.groupId || '—'}</td>
                        <td className="px-4 py-3 text-slate-400">{r.requestedAdvisorId || r.advisorId || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge color={statusColor[sKey] ?? 'slate'}>{sKey || 'UNKNOWN'}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {pending && (
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={!isLeader || Boolean(withdrawLoadingId)}
                              loading={withdrawLoadingId === String(rid)}
                              onClick={() => setWdModal(r)}
                            >
                              Withdraw
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Committee Details ── */}
      {activeTab === 'committee-details' && (
        <Card>
          <p className="mb-1 text-sm font-bold text-slate-200">Group Committee Lookup</p>
          <p className="mb-4 text-xs text-slate-500">Retrieve committee assignment for a group.</p>
          <form className="mb-4 flex gap-3 items-end" onSubmit={handleCommitteeLookup}>
            <div className="flex-1">
              <label className={labelClass}>Group ID</label>
              <input className={inputClass} value={committeeGroupId} onChange={(e) => setCommGId(e.target.value)} required />
            </div>
            <Button type="submit" variant="primary" size="md" loading={committeeState.loading}>
              Look Up
            </Button>
          </form>
          <Toast state={committeeState} />
          {committeeResult && (
            <pre className="mt-2 overflow-x-auto rounded-xl border border-[#1e293b] bg-[#080f1f] p-4 text-xs text-slate-300">
              {JSON.stringify(committeeResult, null, 2)}
            </pre>
          )}
        </Card>
      )}

      {/* ── Group Status ── */}
      {activeTab === 'group-status' && (
        <Card>
          <p className="mb-1 text-sm font-bold text-slate-200">Group Assignment Status</p>
          <p className="mb-4 text-xs text-slate-500">Check your group's advisor assignment, status, and any restrictions.</p>
          <form className="mb-4 flex gap-3 items-end" onSubmit={handleGroupStatusLookup}>
            <div className="flex-1">
              <label className={labelClass}>Group ID</label>
              <input className={inputClass} value={statusGroupId} onChange={(e) => setStatusGId(e.target.value)} required />
            </div>
            <Button type="submit" variant="primary" size="md" loading={groupStatusState.loading}>
              Look Up
            </Button>
          </form>
          <Toast state={groupStatusState} />
          {groupStatusResult && (
            <ul className="mt-2 space-y-2 rounded-xl border border-[#1e293b] bg-[#080f1f] p-4">
              {[
                ['Status', groupStatusResult.status],
                ['Advisor', groupStatusResult.advisorId || groupStatusResult.advisorName],
                ['Can Submit Request', String(groupStatusResult.canSubmitRequest)],
                ['Blocked Reason', groupStatusResult.blockedReason || 'None'],
              ].map(([k, v]) => (
                <li key={k} className="flex items-baseline gap-3 text-sm">
                  <span className="w-40 shrink-0 text-[11px] font-bold uppercase tracking-widest text-slate-500">{k}</span>
                  <span className="text-slate-300">{v || '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Withdraw modal */}
      {withdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl border border-[#1e293b] bg-[#0d1729] p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-bold text-slate-100">Withdraw Request</h3>
            <p className="mb-5 text-sm text-slate-400">
              Are you sure you want to withdraw request{' '}
              <span className="font-semibold text-slate-200">{getRequestId(withdrawModal)}</span>?
            </p>
            {withdrawState.error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {withdrawState.error}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="md" disabled={withdrawState.loading} onClick={() => setWdModal(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="md" loading={withdrawState.loading} onClick={handleWithdraw}>
                Confirm Withdraw
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentGroupManagementPage;
