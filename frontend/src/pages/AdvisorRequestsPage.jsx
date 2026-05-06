import { useState, useEffect, useCallback } from 'react'
import apiClient from '../utils/apiClient'
import apiConfig from '../config/api'
import styles from './GroupLifecyclePage.module.css'

const STATUS_OPTIONS = ['', 'PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN']

const getApiError = (error) => {
  const message = error?.response?.data?.message
  return Array.isArray(message) ? message.join(', ') : message || error.message || 'Unexpected error.'
}

const STATUS_LABELS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
}

function StatusBadge({ status }) {
  const upper = String(status || '').toUpperCase()
  const colorMap = {
    PENDING: { background: 'rgba(245,158,11,0.2)', color: '#fbbf24' },
    APPROVED: { background: 'rgba(34,197,94,0.2)', color: '#4ade80' },
    REJECTED: { background: 'rgba(239,68,68,0.2)', color: '#f87171' },
    WITHDRAWN: { background: 'rgba(239,68,68,0.15)', color: '#f87171' },
  }
  const style = colorMap[upper] || { background: 'rgba(100,116,139,0.2)', color: '#94a3b8' }
  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 700,
        ...style,
      }}
    >
      {STATUS_LABELS[upper] || upper || 'Unknown'}
    </span>
  )
}

function StatusMessage({ state }) {
  if (!state?.message && !state?.error) return null
  return (
    <div
      className={`${styles.statusBlock} ${state.error ? styles.error : styles.success}`}
      role="status"
      aria-live="polite"
    >
      {state.error || state.message}
    </div>
  )
}

function AdvisorRequestsPage() {
  const [requests, setRequests] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [fetchState, setFetchState] = useState({ loading: false, message: '', error: '' })
  const [actionState, setActionState] = useState({ loading: false, message: '', error: '' })
  const [decisionModal, setDecisionModal] = useState(null)

  const fetchRequests = useCallback(async () => {
    setFetchState({ loading: true, message: '', error: '' })
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      const response = await apiClient.get(apiConfig.endpoints.requests, { params })
      const list = response.data?.data || response.data?.items || response.data || []
      setRequests(Array.isArray(list) ? list : [])
      setFetchState({ loading: false, message: '', error: '' })
    } catch (error) {
      setFetchState({ loading: false, message: '', error: getApiError(error) })
      setRequests([])
    }
  }, [statusFilter])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const openDecisionModal = (request, decision) => {
    setActionState({ loading: false, message: '', error: '' })
    setDecisionModal({ request, decision })
  }

  const handleDecision = async () => {
    if (!decisionModal) return
    const { request, decision } = decisionModal
    const requestId = request.requestId || request.id
    setActionState({ loading: true, message: '', error: '' })
    try {
      await apiClient.patch(apiConfig.endpoints.requestDecision(requestId), { decision })
      setActionState({
        loading: false,
        message: `Request ${decision === 'APPROVE' ? 'approved' : 'rejected'} successfully.`,
        error: '',
      })
      setDecisionModal(null)
      await fetchRequests()
    } catch (error) {
      setActionState({ loading: false, message: '', error: getApiError(error) })
    }
  }

  const pendingCount = requests.filter(
    (r) => String(r.status || '').toUpperCase() === 'PENDING',
  ).length

  return (
    <div className={styles.pageContainer}>
      <header className={styles.hero}>
        <div>
          <p className={styles.badge}>Advisor Panel</p>
          <h1>Advisee Requests</h1>
          <p className={styles.lead}>
            Review and respond to team advisee requests. Approving a request assigns the group to
            you; all other pending requests for that group are automatically rejected.
          </p>
        </div>
      </header>

      <div className={styles.singleCardContainer}>
        <section
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              marginBottom: '16px',
            }}
          >
            <label
              style={{ display: 'grid', gap: '6px', fontSize: '14px', color: '#f8fafc', flex: 1, minWidth: '180px' }}
            >
              Filter by Status
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #475569',
                  background: '#334155',
                  color: '#f8fafc',
                  fontSize: '14px',
                }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === '' ? 'All Statuses' : STATUS_LABELS[s] || s}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={fetchRequests}
              disabled={fetchState.loading}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: 'none',
                background: '#1e40af',
                color: '#fff',
                fontWeight: 700,
                cursor: fetchState.loading ? 'not-allowed' : 'pointer',
                opacity: fetchState.loading ? 0.65 : 1,
              }}
            >
              {fetchState.loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          <StatusMessage state={fetchState} />
          <StatusMessage state={actionState} />

          {!fetchState.loading && requests.length === 0 ? (
            <p className={styles.emptyState}>
              {statusFilter ? `No ${statusFilter.toLowerCase()} requests found.` : 'No requests found.'}
            </p>
          ) : (
            <>
              {pendingCount > 0 && (
                <p style={{ color: '#fbbf24', fontSize: '13px', marginBottom: '12px' }}>
                  {pendingCount} pending {pendingCount === 1 ? 'request' : 'requests'} awaiting your decision.
                </p>
              )}
              <ul className={styles.list}>
                {requests.map((request) => {
                  const requestId = request.requestId || request.id
                  const isPending = String(request.status || '').toUpperCase() === 'PENDING'
                  const submittedDate = request.createdAt || request.submittedAt
                  const groupLabel = request.groupName || request.groupId || '-'
                  const submitterLabel = request.submittedByEmail || request.submittedBy || '-'

                  return (
                    <li key={requestId} className={styles.requestRow}>
                      <div>
                        <strong style={{ color: '#f8fafc' }}>Group: {groupLabel}</strong>
                        <p className={styles.requestMeta}>
                          Submitted by: {submitterLabel}
                          {submittedDate
                            ? ` · ${new Date(submittedDate).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}`
                            : ''}
                        </p>
                      </div>
                      <div className={styles.requestActions}>
                        <StatusBadge status={request.status} />
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => openDecisionModal(request, 'APPROVE')}
                              style={{
                                padding: '8px 14px',
                                border: 'none',
                                borderRadius: '10px',
                                background: 'rgba(34,197,94,0.15)',
                                color: '#4ade80',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => openDecisionModal(request, 'REJECT')}
                              style={{
                                padding: '8px 14px',
                                border: 'none',
                                borderRadius: '10px',
                                background: 'rgba(239,68,68,0.15)',
                                color: '#f87171',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </section>
      </div>

      {decisionModal && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="decision-modal-title"
        >
          <div className={styles.modal}>
            <h3 id="decision-modal-title">
              {decisionModal.decision === 'APPROVE' ? 'Approve Request' : 'Reject Request'}
            </h3>
            <p>
              {decisionModal.decision === 'APPROVE'
                ? 'Approving this request will assign the group to you. All other pending requests for this group will be automatically rejected.'
                : 'Are you sure you want to reject this request?'}
            </p>
            <p style={{ marginTop: '8px', color: '#94a3b8', fontSize: '13px' }}>
              Group: <strong style={{ color: '#f8fafc' }}>
                {decisionModal.request.groupName || decisionModal.request.groupId}
              </strong>
            </p>
            <StatusMessage state={actionState} />
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setDecisionModal(null)}
                disabled={actionState.loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDecision}
                disabled={actionState.loading}
                style={{
                  background: decisionModal.decision === 'APPROVE' ? '#15803d' : '#991b1b',
                }}
              >
                {actionState.loading
                  ? 'Processing…'
                  : decisionModal.decision === 'APPROVE'
                  ? 'Confirm Approve'
                  : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvisorRequestsPage
