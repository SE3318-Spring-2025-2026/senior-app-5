import { useMemo, useState } from 'react'
import apiClient from '../utils/apiClient'
import apiConfig from '../config/api'
import EntitySearchSelect from '../components/EntitySearchSelect'
import { SectionCard } from '../components/ui'
import styles from './GroupLifecyclePage.module.css'

const TEAM_LEADER_ROLES = new Set(['TeamLeader', 'TEAM_LEADER', 'Professor'])

const getApiError = (error) => {
  const status = error?.response?.status
  const message = error?.response?.data?.message
  const normalizedMessage = Array.isArray(message) ? message.join(', ') : message
  return { status, message: normalizedMessage || error.message || 'Unexpected error.' }
}

const submitMessages = {
  400: 'Submit request validation failed. Please check your inputs.',
  401: 'Your session has expired. Please login again.',
  403: 'You are not authorized to submit advisor requests.',
  409: 'A conflicting advisor request already exists for this group.',
  423: 'This group is currently blocked from submitting advisor requests.',
  500: 'Server error while submitting advisor request. Please try again later.',
}

const withdrawMessages = {
  400: 'Withdraw request validation failed.',
  401: 'Your session has expired. Please login again.',
  403: 'You are not authorized to withdraw this request.',
  404: 'Request not found. It may have been removed already.',
  409: 'Only pending requests can be withdrawn.',
  500: 'Server error while withdrawing request. Please try again later.',
}

const lookupMessages = {
  401: 'Your session has expired. Please login again.',
  403: 'You are not authorized to view this group data.',
  404: 'Group information not found.',
  500: 'Server error while fetching group information.',
}

const getRequestId = (item) => item.requestId || item.id
const getRequestStatus = (item) => String(item.status || '').toUpperCase()
const isPending = (item) => getRequestStatus(item) === 'PENDING'

function StatusMessage({ state }) {
  if (!state?.message && !state?.error) {
    return null
  }

  return (
    <div
      className={`${styles.statusBlock} ${state.error ? styles.error : styles.success}`}
      role="status"
      aria-live="polite"
    >
      <span>{state.error || state.message}</span>
    </div>
  )
}

function StudentGroupManagementPage() {
  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : null
  const isTeamLeader = TEAM_LEADER_ROLES.has(user?.role)

  // Advisor flow state
  const [advisors, setAdvisors] = useState([])
  const [advisorState, setAdvisorState] = useState({ loading: false, message: '', error: '' })
  const [selectedAdvisorId, setSelectedAdvisorId] = useState('')
  const [advisorPage, setAdvisorPage] = useState(1)
  const [advisorLimit, setAdvisorLimit] = useState(10)

  // Submit advisor request state
  const [groupId, setGroupId] = useState('')
  const [submitState, setSubmitState] = useState({ loading: false, message: '', error: '' })

  // View/withdraw requests state
  const [requests, setRequests] = useState([])
  const [requestState, setRequestState] = useState({ loading: false, message: '', error: '' })
  const [requestWithdrawLoadingId, setRequestWithdrawLoadingId] = useState('')
  const [withdrawModalTarget, setWithdrawModalTarget] = useState(null)
  const [withdrawState, setWithdrawState] = useState({ loading: false, message: '', error: '' })

  // Committee lookup state
  const [committeeGroupId, setCommitteeGroupId] = useState('')
  const [committeeResult, setCommitteeResult] = useState(null)
  const [committeeState, setCommitteeState] = useState({ loading: false, message: '', error: '' })

  // Group status lookup state
  const [statusGroupId, setStatusGroupId] = useState('')
  const [groupStatusResult, setGroupStatusResult] = useState(null)
  const [groupStatusState, setGroupStatusState] = useState({ loading: false, message: '', error: '' })

  // Tab state
  const [activeTab, setActiveTab] = useState('browse-advisors')

  const selectedAdvisor = useMemo(
    () => advisors.find((advisor) => String(advisor.advisorId || advisor.id) === String(selectedAdvisorId)),
    [advisors, selectedAdvisorId],
  )

  // Advisor flow handlers
  const fetchAdvisors = async () => {
    setAdvisorState({ loading: true, message: '', error: '' })
    try {
      const response = await apiClient.get(apiConfig.endpoints.advisors, {
        params: { page: advisorPage, limit: advisorLimit },
      })
      const list = response.data?.data || response.data?.items || response.data || []
      setAdvisors(Array.isArray(list) ? list : [])
      setAdvisorState({ loading: false, message: 'Advisor list loaded.', error: '' })
    } catch (error) {
      const { message } = getApiError(error)
      setAdvisors([])
      setAdvisorState({ loading: false, message: '', error: message || 'Could not load advisors.' })
    }
  }

  const handleSubmitRequest = async (event) => {
    event.preventDefault()
    setSubmitState({ loading: true, message: '', error: '' })
    try {
      await apiClient.post(apiConfig.endpoints.requests, {
        groupId,
        advisorId: selectedAdvisorId,
      })
      setSubmitState({ loading: false, message: 'Advisor request submitted successfully.', error: '' })
      await fetchRequests()
    } catch (error) {
      const { status, message } = getApiError(error)
      setSubmitState({
        loading: false,
        message: '',
        error: submitMessages[status] || message || 'Failed to submit advisor request.',
      })
    }
  }

  const fetchRequests = async () => {
    setRequestState({ loading: true, message: '', error: '' })
    try {
      const response = await apiClient.get(apiConfig.endpoints.requests)
      const list = response.data?.data || response.data?.items || response.data || []
      setRequests(Array.isArray(list) ? list : [])
      setRequestState({ loading: false, message: 'Request list loaded.', error: '' })
    } catch (error) {
      const { message } = getApiError(error)
      setRequests([])
      setRequestState({ loading: false, message: '', error: message || 'Could not load requests.' })
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawModalTarget) {
      return
    }
    const requestId = getRequestId(withdrawModalTarget)
    setWithdrawState({ loading: true, message: '', error: '' })
    setRequestWithdrawLoadingId(String(requestId))

    try {
      await apiClient.patch(apiConfig.endpoints.requestById(requestId), { action: 'withdraw' })
      setWithdrawState({ loading: false, message: `Request ${requestId} withdrawn.`, error: '' })
      setWithdrawModalTarget(null)
      await fetchRequests()
    } catch (error) {
      const { status, message } = getApiError(error)
      setWithdrawState({
        loading: false,
        message: '',
        error: withdrawMessages[status] || message || 'Failed to withdraw request.',
      })
    } finally {
      setRequestWithdrawLoadingId('')
    }
  }

  const handleCommitteeLookup = async (event) => {
    event.preventDefault()
    setCommitteeState({ loading: true, message: '', error: '' })
    setCommitteeResult(null)
    try {
      const response = await apiClient.get(apiConfig.endpoints.groupCommittee(committeeGroupId))
      setCommitteeResult(response.data || null)
      setCommitteeState({ loading: false, message: 'Committee information loaded.', error: '' })
    } catch (error) {
      const { status, message } = getApiError(error)
      setCommitteeState({
        loading: false,
        message: '',
        error: lookupMessages[status] || message || 'Could not fetch committee information.',
      })
    }
  }

  const handleGroupStatusLookup = async (event) => {
    event.preventDefault()
    setGroupStatusState({ loading: true, message: '', error: '' })
    setGroupStatusResult(null)
    try {
      const response = await apiClient.get(apiConfig.endpoints.groupStatus(statusGroupId))
      setGroupStatusResult(response.data || null)
      setGroupStatusState({ loading: false, message: 'Group assignment status loaded.', error: '' })
    } catch (error) {
      const { status, message } = getApiError(error)
      setGroupStatusState({
        loading: false,
        message: '',
        error: lookupMessages[status] || message || 'Could not fetch group status.',
      })
    }
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.hero}>
        <div>
          <p className={styles.badge}>Student Group Management</p>
          <h1>Group Management Hub</h1>
          <p className={styles.lead}>
           Take control of your academic project: manage advisor requests, track your status, and view committee details.
          </p>
        </div>
      </header>

      <nav className={styles.tabMenu}>
        <button
          className={`${styles.tabButton} ${activeTab === 'browse-advisors' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('browse-advisors')}
        >
          Browse Advisors
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'my-requests' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('my-requests')}
        >
          My Requests
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'committee-details' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('committee-details')}
        >
          Committee Details
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'group-status' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('group-status')}
        >
          Group Status
        </button>
      </nav>

      <main className={activeTab === 'browse-advisors' ? styles.grid : styles.singleCardContainer}>
        {activeTab === 'browse-advisors' && (
          <>
            <SectionCard title="Advisor List" description="Browse advisors with pagination and choose one for request submission.">
              <div className={styles.inlineControls}>
                <label>
                  Page
                  <input
                    type="number"
                    min="1"
                    value={advisorPage}
                    onChange={(e) => setAdvisorPage(Number(e.target.value) || 1)}
                  />
                </label>
                <label>
                  Limit
                  <input
                    type="number"
                    min="1"
                    value={advisorLimit}
                    onChange={(e) => setAdvisorLimit(Number(e.target.value) || 10)}
                  />
                </label>
                <button type="button" onClick={fetchAdvisors} disabled={advisorState.loading}>
                  {advisorState.loading ? 'Loading…' : 'Load Advisors'}
                </button>
              </div>
              <StatusMessage state={advisorState} />
              {advisors.length === 0 ? (
                <p className={styles.emptyState}>No advisors loaded yet.</p>
              ) : (
                <ul className={styles.list}>
                  {advisors.map((advisor) => {
                    const advisorId = String(advisor.advisorId || advisor.id)
                    const advisorName = advisor.name || advisor.fullName || advisor.email || `Advisor ${advisorId}`
                    return (
                      <li key={advisorId} className={styles.listItem}>
                        <label className={styles.radioRow}>
                          <input
                            type="radio"
                            name="advisor"
                            checked={selectedAdvisorId === advisorId}
                            onChange={() => setSelectedAdvisorId(advisorId)}
                          />
                          <span>{advisorName}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Submit Advisor Request" description="Finalize your selection and submit a request to the advisor.">
              <form className={styles.form} onSubmit={handleSubmitRequest}>
                <label>
                  Group ID
                  <input value={groupId} onChange={(e) => setGroupId(e.target.value)} required />
                </label>
                <label>
                  Selected Advisor
                  <input
                    value={selectedAdvisor ? selectedAdvisor.name || selectedAdvisor.fullName || selectedAdvisorId : ''}
                    disabled
                  />
                </label>
                <button
                  type="submit"
                  disabled={!isTeamLeader || !groupId || !selectedAdvisorId || submitState.loading}
                >
                  {submitState.loading ? 'Submitting…' : 'Submit Request'}
                </button>
              </form>
              {!isTeamLeader && <p className={styles.note}>Please note: Only the Team Leader can submit this request..</p>}
              <StatusMessage state={submitState} />
            </SectionCard>
          </>
        )}

        {activeTab === 'my-requests' && (
          <SectionCard title="Advisor Requests" description="View statuses and withdraw only pending requests.">
            <div className={styles.inlineControls}>
              <button type="button" onClick={fetchRequests} disabled={requestState.loading}>
                {requestState.loading ? 'Refreshing…' : 'Refresh Requests'}
              </button>
            </div>
            <StatusMessage state={requestState} />
            <StatusMessage state={withdrawState} />
            {requests.length === 0 ? (
              <p className={styles.emptyState}>No requests found.</p>
            ) : (
              <ul className={styles.list}>
                {requests.map((request) => {
                  const requestId = getRequestId(request)
                  const pending = isPending(request)
                  return (
                    <li key={requestId} className={styles.requestRow}>
                      <div>
                        <strong>{requestId}</strong>
                        <p className={styles.requestMeta}>
                          Group: {request.groupId || '-'} | Advisor: {request.advisorId || '-'}
                        </p>
                      </div>
                      <div className={styles.requestActions}>
                        <span
                          className={`${styles.badgeStatus} ${pending ? styles.pending : styles.nonPending}`}
                        >
                          {getRequestStatus(request) || 'UNKNOWN'}
                        </span>
                        <button
                          type="button"
                          disabled={!isTeamLeader || !pending || Boolean(requestWithdrawLoadingId)}
                          onClick={() => setWithdrawModalTarget(request)}
                        >
                          {requestWithdrawLoadingId === String(requestId) ? 'Withdrawing…' : 'Withdraw'}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </SectionCard>
        )}

        {activeTab === 'committee-details' && (
          <SectionCard title="Group Committee Lookup" description="Retrieve committee assignment for a group.">
            <form className={styles.form} onSubmit={handleCommitteeLookup}>
              <label>
                Group ID
                <input value={committeeGroupId} onChange={(e) => setCommitteeGroupId(e.target.value)} required />
              </label>
              <button type="submit" disabled={committeeState.loading}>
                {committeeState.loading ? 'Loading…' : 'Get Committee'}
              </button>
            </form>
            <StatusMessage state={committeeState} />
            {committeeResult && (
              <div className={styles.resultBox}>
                <pre>{JSON.stringify(committeeResult, null, 2)}</pre>
              </div>
            )}
          </SectionCard>
        )}

        {activeTab === 'group-status' && (
          <SectionCard title="Check your group's assignment status, advisor information, and any restrictions on submitting requests.">
            <form className={styles.form} onSubmit={handleGroupStatusLookup}>
              <label>
                Group ID
                <input value={statusGroupId} onChange={(e) => setStatusGroupId(e.target.value)} required />
              </label>
              <button type="submit" disabled={groupStatusState.loading}>
                {groupStatusState.loading ? 'Loading…' : 'Get Status'}
              </button>
            </form>
            <StatusMessage state={groupStatusState} />
            {groupStatusResult && (
              <div className={styles.resultBox}>
                <ul className={styles.resultList}>
                  <li>Status: {groupStatusResult.status || '-'}</li>
                  <li>Advisor: {groupStatusResult.advisorId || groupStatusResult.advisorName || '-'}</li>
                  <li>canSubmitRequest: {String(groupStatusResult.canSubmitRequest)}</li>
                  <li>blockedReason: {groupStatusResult.blockedReason || '-'}</li>
                </ul>
              </div>
            )}
          </SectionCard>
        )}
      </main>

      {withdrawModalTarget && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="withdraw-modal-title">
          <div className={styles.modal}>
            <h3 id="withdraw-modal-title">Withdraw Request</h3>
            <p>
              Are you sure you want to withdraw request <strong>{getRequestId(withdrawModalTarget)}</strong>?
            </p>
            <div className={styles.modalActions}>
              <button type="button" onClick={() => setWithdrawModalTarget(null)} disabled={withdrawState.loading}>
                Cancel
              </button>
              <button type="button" onClick={handleWithdraw} disabled={withdrawState.loading}>
                {withdrawState.loading ? 'Withdrawing…' : 'Confirm Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentGroupManagementPage
