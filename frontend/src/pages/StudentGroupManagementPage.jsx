import { useEffect, useMemo, useState } from 'react'
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
  const [currentUser, setCurrentUser] = useState(null)
  const [userLoaded, setUserLoaded] = useState(false)

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await apiClient.get(apiConfig.endpoints.auth.me)
        const fresh = res.data
        if (fresh) {
          const updated = { ...fresh, teamId: fresh.teamId ?? fresh.groupId ?? null }
          localStorage.setItem('user', JSON.stringify(updated))
          setCurrentUser(updated)
        }
      } catch {
        const userStr = localStorage.getItem('user')
        setCurrentUser(userStr ? JSON.parse(userStr) : null)
      } finally {
        setUserLoaded(true)
      }
    }
    fetchMe()
  }, [])

  const isTeamLeader = TEAM_LEADER_ROLES.has(currentUser?.role)
  const knownGroupId = currentUser?.teamId || currentUser?.groupId || ''

  // Advisor flow state
  const [advisors, setAdvisors] = useState([])
  const [advisorState, setAdvisorState] = useState({ loading: false, message: '', error: '' })
  const [selectedAdvisorId, setSelectedAdvisorId] = useState('')
  const [advisorPage, setAdvisorPage] = useState(1)
  const [advisorLimit] = useState(10)
  const [advisorTotalPages, setAdvisorTotalPages] = useState(1)

  // Submit advisor request state
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

  const advisorMap = useMemo(
    () => Object.fromEntries(
      advisors.map((a) => [String(a.advisorId || a.id), a.name || a.fullName || a.email || ''])
    ),
    [advisors],
  )

  const getAdvisorName = (id) => {
    if (!id) return '—'
    const found = advisorMap[String(id)]
    return found || `…${String(id).slice(-8)}`
  }

  // Advisor flow handlers
  const fetchAdvisors = async (page = advisorPage) => {
    setAdvisorState({ loading: true, message: '', error: '' })
    try {
      const response = await apiClient.get(apiConfig.endpoints.advisors, {
        params: { page, limit: advisorLimit },
      })
      const data = response.data
      const list = data?.data || data?.items || (Array.isArray(data) ? data : [])
      const totalPages =
        data?.totalPages ??
        (data?.total ? Math.ceil(data.total / advisorLimit) : null) ??
        (data?.totalCount ? Math.ceil(data.totalCount / advisorLimit) : null) ??
        1
      setAdvisors(Array.isArray(list) ? list : [])
      setAdvisorTotalPages(Math.max(1, totalPages))
      setAdvisorState({ loading: false, message: '', error: '' })
    } catch (error) {
      const { message } = getApiError(error)
      setAdvisors([])
      setAdvisorState({ loading: false, message: '', error: message || 'Could not load advisors.' })
    }
  }

  const handleSubmitRequest = async () => {
    if (!selectedAdvisorId) {
      setSubmitState({ loading: false, message: '', error: 'Please select an advisor first.' })
      return
    }
    setSubmitState({ loading: true, message: '', error: '' })
    try {
      await apiClient.post(apiConfig.endpoints.requests, {
        requestedAdvisorId: selectedAdvisorId,
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

  const fetchCommitteeById = async (groupId) => {
    if (!groupId) return
    setCommitteeState({ loading: true, message: '', error: '' })
    setCommitteeResult(null)
    try {
      const response = await apiClient.get(apiConfig.endpoints.groupCommittee(groupId))
      setCommitteeResult(response.data || null)
      setCommitteeState({ loading: false, message: '', error: '' })
    } catch (error) {
      const { status, message } = getApiError(error)
      setCommitteeState({
        loading: false,
        message: '',
        error: lookupMessages[status] || message || 'Could not fetch committee information.',
      })
    }
  }

  const handleCommitteeLookup = async (event) => {
    event.preventDefault()
    await fetchCommitteeById(committeeGroupId)
  }

  const fetchGroupStatusById = async (groupId) => {
    if (!groupId) return
    setGroupStatusState({ loading: true, message: '', error: '' })
    setGroupStatusResult(null)
    try {
      const response = await apiClient.get(apiConfig.endpoints.groupStatus(groupId))
      setGroupStatusResult(response.data || null)
      setGroupStatusState({ loading: false, message: '', error: '' })
    } catch (error) {
      const { status, message } = getApiError(error)
      setGroupStatusState({
        loading: false,
        message: '',
        error: lookupMessages[status] || message || 'Could not fetch group status.',
      })
    }
  }

  const handleGroupStatusLookup = async (event) => {
    event.preventDefault()
    await fetchGroupStatusById(statusGroupId)
  }

  // Auto-load on mount and on page change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAdvisors(advisorPage) }, [advisorPage])

  // Auto-load on tab change
  useEffect(() => {
    if (activeTab === 'my-requests') {
      fetchRequests()
    } else if (activeTab === 'committee-details') {
      const gid = knownGroupId
      if (gid) {
        setCommitteeGroupId(gid)
        fetchCommitteeById(gid)
      }
    } else if (activeTab === 'group-status') {
      const gid = knownGroupId
      if (gid) {
        setStatusGroupId(gid)
        fetchGroupStatusById(gid)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

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

      <main className={styles.singleCardContainer}>
        {activeTab === 'browse-advisors' && (
          <SectionCard title="Browse Advisors" description="Select an advisor from the list below and submit your request.">
            <StatusMessage state={advisorState} />
            {advisorState.loading ? (
              <p className={styles.emptyState}>Loading advisors…</p>
            ) : advisors.length === 0 ? (
              <p className={styles.emptyState}>No advisors found.</p>
            ) : (
              <ul className={styles.list}>
                {advisors.map((advisor) => {
                  const advisorId = String(advisor.advisorId || advisor.id)
                  const advisorName = advisor.name || advisor.fullName || advisor.email || `Advisor ${advisorId.slice(-8)}`
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
            {advisorTotalPages > 1 && (
              <div className={styles.pagination}>
                {Array.from({ length: advisorTotalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`${styles.pageBtn} ${p === advisorPage ? styles.pageBtnActive : ''}`}
                    onClick={() => setAdvisorPage(p)}
                    disabled={advisorState.loading}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            {isTeamLeader && (
              <div className={styles.form} style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #1e293b' }}>
                <div className={styles.resultBox}>
                  <ul className={styles.resultList}>
                    <li><strong>Selected Advisor</strong><span>{selectedAdvisor ? (selectedAdvisor.name || selectedAdvisor.fullName || selectedAdvisor.email || '—') : 'None selected'}</span></li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={handleSubmitRequest}
                  disabled={!selectedAdvisorId || submitState.loading}
                >
                  {submitState.loading ? 'Submitting…' : 'Submit Request'}
                </button>
                <StatusMessage state={submitState} />
              </div>
            )}
          </SectionCard>
        )}

        {activeTab === 'my-requests' && (
          <SectionCard title="Advisor Requests" description="View statuses and withdraw only pending requests.">
            <StatusMessage state={requestState} />
            <StatusMessage state={withdrawState} />
            {requests.length === 0 ? (
              <p className={styles.emptyState}>No requests found.</p>
            ) : (
              <ul className={styles.list}>
                {requests.map((request) => {
                  const requestId = getRequestId(request)
                  const pending = isPending(request)
                  const advisorDisplay = request.advisorName || request.advisor?.name || getAdvisorName(request.advisorId)
                  return (
                    <li key={requestId} className={styles.requestRow}>
                      <div>
                        <strong>{advisorDisplay}</strong>
                        <p className={styles.requestMeta}>
                          {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : ''}
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
          <SectionCard title="Committee Details" description="Committee assigned to your group.">
            <StatusMessage state={committeeState} />
            {committeeState.loading && <p className={styles.emptyState}>Loading committee info…</p>}
            {!committeeState.loading && !committeeResult && !committeeState.error && (
              <p className={styles.emptyState}>No committee assigned to your group yet.</p>
            )}
            {committeeResult && (
              <div className={styles.resultBox}>
                <ul className={styles.resultList}>
                  <li><strong>Committee ID</strong><span>{committeeResult.id || '—'}</span></li>
                  <li><strong>Committee Name</strong><span>{committeeResult.name || '—'}</span></li>
                  <li><strong>Group ID</strong><span>{committeeGroupId || '—'}</span></li>
                  <li>
                    <strong>Jury Members</strong>
                    <span>{committeeResult.jury?.length ? committeeResult.jury.map((j) => j.name || j.userId).join(', ') : 'None'}</span>
                  </li>
                  <li>
                    <strong>Advisors</strong>
                    <span>{committeeResult.advisors?.length ? committeeResult.advisors.map((a) => a.name || a.userId).join(', ') : 'None'}</span>
                  </li>
                  <li><strong>Created At</strong><span>{committeeResult.createdAt ? new Date(committeeResult.createdAt).toLocaleDateString() : '—'}</span></li>
                </ul>
              </div>
            )}
          </SectionCard>
        )}

        {activeTab === 'group-status' && (
          <SectionCard title="Group Status" description="Your group's current assignment status and restrictions.">
            <StatusMessage state={groupStatusState} />
            {groupStatusState.loading && <p className={styles.emptyState}>Loading group status…</p>}
            {!groupStatusState.loading && !groupStatusResult && !groupStatusState.error && (
              <p className={styles.emptyState}>No status information available for your group.</p>
            )}
            {groupStatusResult && (
              <div className={styles.resultBox}>
                <ul className={styles.resultList}>
                  <li><strong>Status</strong><span>{groupStatusResult.status || '—'}</span></li>
                  <li><strong>Advisor</strong><span>{groupStatusResult.advisorName || getAdvisorName(groupStatusResult.advisorId)}</span></li>
                  <li><strong>Can Submit Request</strong><span>{groupStatusResult.canSubmitRequest ? 'Yes' : 'No'}</span></li>
                  <li><strong>Blocked Reason</strong><span>{groupStatusResult.blockedReason || '—'}</span></li>
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
              Are you sure you want to withdraw your request for advisor <strong>{withdrawModalTarget.advisorName || withdrawModalTarget.advisor?.name || getAdvisorName(withdrawModalTarget.advisorId)}</strong>?
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
