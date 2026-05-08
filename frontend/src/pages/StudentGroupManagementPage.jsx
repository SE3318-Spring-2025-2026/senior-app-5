import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [reopenLoadingId, setReopenLoadingId] = useState('')
  const [reopenState, setReopenState] = useState({ message: '', error: '' })

  // Committee lookup state
  const [committeeGroupId, setCommitteeGroupId] = useState('')
  const [committeeResult, setCommitteeResult] = useState(null)
  const [committeeState, setCommitteeState] = useState({ loading: false, message: '', error: '' })

  // Group status lookup state
  const [statusGroupId, setStatusGroupId] = useState('')
  const [groupStatusResult, setGroupStatusResult] = useState(null)
  const [groupStatusState, setGroupStatusState] = useState({ loading: false, message: '', error: '' })

  // Team creation state (Student without a team)
  const [newTeamName, setNewTeamName] = useState('')
  const [createTeamState, setCreateTeamState] = useState({ loading: false, message: '', error: '' })

  // Invite management state (TeamLeader)
  const [inviteEmail, setInviteEmail] = useState('')
  const [sendInviteState, setSendInviteState] = useState({ loading: false, message: '', error: '' })
  const [groupInvites, setGroupInvites] = useState([])
  const [groupInvitesState, setGroupInvitesState] = useState({ loading: false, message: '', error: '' })
  const invitePollingRef = useRef(null)

  // My invites state (Student without a team)
  const [myInvites, setMyInvites] = useState([])
  const [myInvitesState, setMyInvitesState] = useState({ loading: false, message: '', error: '' })
  const [respondingInviteId, setRespondingInviteId] = useState('')

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

  const advisorEmailMap = useMemo(
    () => Object.fromEntries(
      advisors.map((a) => [String(a.advisorId || a.id), a.email || ''])
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
      const STATUS_ORDER = { PENDING: 0, APPROVED: 1, REJECTED: 2, WITHDRAWN: 3 }
      const sorted = (Array.isArray(list) ? list : []).sort((a, b) => {
        const sa = STATUS_ORDER[String(a.status || '').toUpperCase()] ?? 99
        const sb = STATUS_ORDER[String(b.status || '').toUpperCase()] ?? 99
        return sa - sb
      })
      setRequests(sorted)
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
      await apiClient.patch(apiConfig.endpoints.requestById(requestId), { status: 'WITHDRAWN' })
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

  const handleReopen = async (request) => {
    const advisorId = request.requestedAdvisorId || request.advisorId
    if (!advisorId) return
    const requestId = getRequestId(request)
    setReopenLoadingId(String(requestId))
    setReopenState({ message: '', error: '' })
    try {
      await apiClient.post(apiConfig.endpoints.requests, { requestedAdvisorId: advisorId })
      setReopenState({ message: 'Request re-opened successfully.', error: '' })
      await fetchRequests()
    } catch (error) {
      const { message } = getApiError(error)
      setReopenState({ message: '', error: message || 'Failed to re-open request.' })
    } finally {
      setReopenLoadingId('')
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

  // ─── Team creation ───────────────────────────────────────────────────────
  const handleCreateTeam = async (event) => {
    event.preventDefault()
    if (!newTeamName.trim()) return
    setCreateTeamState({ loading: true, message: '', error: '' })
    try {
      await apiClient.post(apiConfig.endpoints.groupMyTeam, { groupName: newTeamName.trim() })
      setCreateTeamState({ loading: false, message: 'Team created! Your role has been updated to Team Leader.', error: '' })
      setNewTeamName('')
      // Refresh user context so role/teamId is reflected
      try {
        const me = await apiClient.get(apiConfig.endpoints.me)
        if (me.data && setCurrentUser) setCurrentUser(me.data)
      } catch { /* ignore */ }
    } catch (error) {
      const { status, message } = getApiError(error)
      setCreateTeamState({
        loading: false,
        message: '',
        error: lookupMessages[status] || message || 'Could not create team.',
      })
    }
  }

  // ─── TeamLeader invite management ─────────────────────────────────────────
  const fetchGroupInvites = async () => {
    if (!knownGroupId) return
    setGroupInvitesState({ loading: true, message: '', error: '' })
    try {
      const response = await apiClient.get(apiConfig.endpoints.groupInvites(knownGroupId))
      setGroupInvites(response.data || [])
      setGroupInvitesState({ loading: false, message: '', error: '' })
    } catch (error) {
      const { status, message } = getApiError(error)
      setGroupInvitesState({
        loading: false,
        message: '',
        error: lookupMessages[status] || message || 'Could not fetch invites.',
      })
    }
  }

  const handleSendInvite = async (event) => {
    event.preventDefault()
    if (!inviteEmail.trim()) return
    setSendInviteState({ loading: true, message: '', error: '' })
    try {
      await apiClient.post(apiConfig.endpoints.groupInvites(knownGroupId), { invitedUserEmail: inviteEmail.trim() })
      setSendInviteState({ loading: false, message: `Invite sent to ${inviteEmail.trim()}!`, error: '' })
      setInviteEmail('')
      fetchGroupInvites()
    } catch (error) {
      const { status, message } = getApiError(error)
      setSendInviteState({
        loading: false,
        message: '',
        error: lookupMessages[status] || message || 'Could not send invite.',
      })
    }
  }

  // ─── Student pending invites ──────────────────────────────────────────────
  const fetchMyInvites = async () => {
    setMyInvitesState({ loading: true, message: '', error: '' })
    try {
      const response = await apiClient.get(apiConfig.endpoints.groupMyInvites)
      setMyInvites(response.data || [])
      setMyInvitesState({ loading: false, message: '', error: '' })
    } catch (error) {
      const { status, message } = getApiError(error)
      setMyInvitesState({
        loading: false,
        message: '',
        error: lookupMessages[status] || message || 'Could not fetch invites.',
      })
    }
  }

  const handleRespondToInvite = async (inviteId, accept) => {
    setRespondingInviteId(inviteId)
    try {
      await apiClient.patch(apiConfig.endpoints.groupInviteRespond(inviteId), { accept })
      if (accept) {
        // Refresh user so teamId appears
        try {
          const me = await apiClient.get(apiConfig.endpoints.me)
          if (me.data && setCurrentUser) setCurrentUser(me.data)
        } catch { /* ignore */ }
      }
      fetchMyInvites()
    } catch (error) {
      const { status, message } = getApiError(error)
      setMyInvitesState((prev) => ({
        ...prev,
        error: lookupMessages[status] || message || 'Could not respond to invite.',
      }))
    } finally {
      setRespondingInviteId('')
    }
  }


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
    } else if (activeTab === 'team-invites') {
      if (knownGroupId) fetchGroupInvites()
    } else if (activeTab === 'my-invites') {
      fetchMyInvites()
    }

    // Start polling for team-invites tab
    if (activeTab === 'team-invites' && knownGroupId) {
      invitePollingRef.current = setInterval(() => fetchGroupInvites(), 10000)
    } else {
      clearInterval(invitePollingRef.current)
    }

    return () => clearInterval(invitePollingRef.current)
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
        {isTeamLeader && (
          <button
            className={`${styles.tabButton} ${activeTab === 'browse-advisors' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('browse-advisors')}
          >
            Browse Advisors
          </button>
        )}
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
        {currentUser?.role === 'Student' && !knownGroupId && (
          <button
            className={`${styles.tabButton} ${activeTab === 'create-team' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('create-team')}
          >
            Create Team
          </button>
        )}
        {currentUser?.role === 'Student' && !knownGroupId && (
          <button
            className={`${styles.tabButton} ${activeTab === 'my-invites' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('my-invites')}
          >
            My Invites
          </button>
        )}
        {isTeamLeader && (
          <button
            className={`${styles.tabButton} ${activeTab === 'team-invites' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('team-invites')}
          >
            Team Invites
          </button>
        )}
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
            <StatusMessage state={reopenState} />
            {requests.length === 0 ? (
              <p className={styles.emptyState}>No requests found.</p>
            ) : (
              <ul className={styles.list}>
                {requests.map((request) => {
                  const requestId = getRequestId(request)
                  const status = getRequestStatus(request)
                  const pending = status === 'PENDING'
                  const withdrawn = status === 'WITHDRAWN'
                  const advisorId = request.requestedAdvisorId || request.advisorId
                  const advisorDisplay = request.advisorName || request.advisor?.name || getAdvisorName(advisorId)
                  const advisorEmail = request.advisorEmail || request.advisor?.email || advisorEmailMap[String(advisorId)] || ''
                  return (
                    <li key={requestId} className={styles.requestRow}>
                      <div>
                        <strong>{advisorDisplay}</strong>
                        <p className={styles.requestMeta}>
                          {advisorEmail && <span>{advisorEmail} · </span>}
                          {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : ''}
                        </p>
                      </div>
                      <div className={styles.requestActions}>
                        <span
                          className={`${styles.badgeStatus} ${pending ? styles.pending : styles.nonPending}`}
                        >
                          {status || 'UNKNOWN'}
                        </span>
                        {pending && isTeamLeader && (
                          <button
                            type="button"
                            className={styles.btnDanger}
                            disabled={Boolean(requestWithdrawLoadingId)}
                            onClick={() => setWithdrawModalTarget(request)}
                          >
                            {requestWithdrawLoadingId === String(requestId) ? 'Withdrawing…' : 'Withdraw'}
                          </button>
                        )}
                        {withdrawn && isTeamLeader && (
                          <button
                            type="button"
                            className={styles.btnGhost}
                            disabled={Boolean(reopenLoadingId)}
                            onClick={() => handleReopen(request)}
                          >
                            {reopenLoadingId === String(requestId) ? 'Re-opening…' : 'Re-open'}
                          </button>
                        )}
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
                  <li><strong>Committee Name</strong><span>{committeeResult.name || '—'}</span></li>
                  <li>
                    <strong>Advisor</strong>
                    <span>
                      {committeeResult.advisors?.length
                        ? (committeeResult.advisors[0].email ?? committeeResult.advisors[0].name ?? committeeResult.advisors[0].userId ?? '—')
                        : 'None'}
                    </span>
                  </li>
                  <li>
                    <strong>Jury Members</strong>
                    <span>
                      {committeeResult.jury?.length
                        ? committeeResult.jury.map((j, i) => (
                            <span key={i} style={{ display: 'block' }}>
                              {j.email ?? j.name ?? j.userId}
                            </span>
                          ))
                        : 'None'}
                    </span>
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
                  {groupStatusResult.groupName && (
                    <li><strong>Group Name</strong><span>{groupStatusResult.groupName}</span></li>
                  )}
                  <li><strong>Status</strong><span>{groupStatusResult.status || '—'}</span></li>
                  {groupStatusResult.advisorName && (
                    <li>
                      <strong>Advisor</strong>
                      <span>
                        {groupStatusResult.advisorName}
                        {groupStatusResult.advisorEmail && groupStatusResult.advisorEmail !== groupStatusResult.advisorName && (
                          <span style={{ color: '#64748b', fontSize: '0.8rem', display: 'block' }}>
                            {groupStatusResult.advisorEmail}
                          </span>
                        )}
                      </span>
                    </li>
                  )}
                  <li><strong>Can Submit Request</strong><span>{groupStatusResult.canSubmitRequest ? 'Yes' : 'No'}</span></li>
                  {groupStatusResult.blockedReason && (
                    <li><strong>Blocked Reason</strong><span>{groupStatusResult.blockedReason}</span></li>
                  )}
                </ul>
                {groupStatusResult.members && groupStatusResult.members.length > 0 && (
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #1e293b' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b', margin: '0 0 10px' }}>
                      Members ({groupStatusResult.members.length})
                    </p>
                    <ul className={styles.list}>
                      {groupStatusResult.members.map((member, i) => (
                        <li key={i} className={styles.listItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                          <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{member.name || member.email}</span>
                          {member.name && <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{member.email}</span>}
                          <span style={{ fontSize: '0.7rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{member.role}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        )}

        {activeTab === 'create-team' && (
          <SectionCard title="Create a Team" description="Give your new team a name. You will automatically become the Team Leader.">
            <StatusMessage state={createTeamState} />
            <form onSubmit={handleCreateTeam} className={styles.form}>
              <label htmlFor="new-team-name">Team Name</label>
              <input
                id="new-team-name"
                type="text"
                placeholder="e.g. Alpha Squad"
                value={newTeamName}
                maxLength={100}
                onChange={(e) => setNewTeamName(e.target.value)}
                disabled={createTeamState.loading}
              />
              <button type="submit" disabled={createTeamState.loading || !newTeamName.trim()}>
                {createTeamState.loading ? 'Creating…' : 'Create Team'}
              </button>
            </form>
          </SectionCard>
        )}

        {activeTab === 'my-invites' && (
          <SectionCard title="My Pending Invites" description="Accept or reject invitations to join a team.">
            <StatusMessage state={myInvitesState} />
            {myInvitesState.loading && <p className={styles.emptyState}>Loading invites…</p>}
            {!myInvitesState.loading && myInvites.length === 0 && !myInvitesState.error && (
              <p className={styles.emptyState}>No pending invites.</p>
            )}
            {myInvites.length > 0 && (
              <ul className={styles.list}>
                {myInvites.map((invite) => (
                  <li key={invite.inviteId} className={styles.requestRow}>
                    <div>
                      <strong>{invite.groupName || invite.groupId}</strong>
                      <p className={styles.requestMeta}>
                        {invite.createdAt ? new Date(invite.createdAt).toLocaleDateString() : ''}
                      </p>
                    </div>
                    <div className={styles.requestActions}>
                      <button
                        type="button"
                        disabled={!!respondingInviteId}
                        onClick={() => handleRespondToInvite(invite.inviteId, true)}
                      >
                        {respondingInviteId === invite.inviteId ? 'Processing…' : 'Accept'}
                      </button>
                      <button
                        type="button"
                        disabled={!!respondingInviteId}
                        onClick={() => handleRespondToInvite(invite.inviteId, false)}
                      >
                        {respondingInviteId === invite.inviteId ? 'Processing…' : 'Reject'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        )}

        {activeTab === 'team-invites' && isTeamLeader && (
          <SectionCard title="Team Invites" description="Invite students to your team by email address. Statuses refresh every 10 seconds.">
            <form onSubmit={handleSendInvite} className={styles.form}>
              <label htmlFor="invite-email">Student Email</label>
              <input
                id="invite-email"
                type="email"
                placeholder="student@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={sendInviteState.loading}
              />
              <button type="submit" disabled={sendInviteState.loading || !inviteEmail.trim()}>
                {sendInviteState.loading ? 'Sending…' : 'Send Invite'}
              </button>
              <StatusMessage state={sendInviteState} />
            </form>

            <div style={{ marginTop: 24 }}>
              <StatusMessage state={groupInvitesState} />
              {groupInvitesState.loading && groupInvites.length === 0 && (
                <p className={styles.emptyState}>Loading invites…</p>
              )}
              {!groupInvitesState.loading && groupInvites.length === 0 && !groupInvitesState.error && (
                <p className={styles.emptyState}>No invites sent yet.</p>
              )}
              {groupInvites.length > 0 && (
                <ul className={styles.list}>
                  {groupInvites.map((invite) => (
                    <li key={invite.inviteId} className={styles.requestRow}>
                      <div>
                        <strong>{invite.invitedUser?.name || invite.invitedUser?.email || invite.invitedUser?.id}</strong>
                        {invite.invitedUser?.name && (
                          <p className={styles.requestMeta}>{invite.invitedUser.email}</p>
                        )}
                        <p className={styles.requestMeta}>
                          {invite.createdAt ? new Date(invite.createdAt).toLocaleDateString() : ''}
                        </p>
                      </div>
                      <div className={styles.requestActions}>
                        <span
                          className={`${styles.badgeStatus} ${
                            invite.status === 'PENDING'
                              ? styles.pending
                              : styles.nonPending
                          }`}
                        >
                          {invite.status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
              <button type="button" className={styles.btnGhost} onClick={() => setWithdrawModalTarget(null)} disabled={withdrawState.loading}>
                Cancel
              </button>
              <button type="button" className={styles.btnDanger} onClick={handleWithdraw} disabled={withdrawState.loading}>
                {withdrawState.loading ? 'Withdrawing…' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentGroupManagementPage
