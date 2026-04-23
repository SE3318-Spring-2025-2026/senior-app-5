import { useMemo, useState } from 'react'
import apiClient from '../utils/apiClient'
import apiConfig from '../config/api'
import EntitySearchSelect from '../components/EntitySearchSelect'
import styles from './GroupLifecyclePage.module.css'

const TEAM_LEADER_ROLES = new Set(['TeamLeader', 'TEAM_LEADER', 'Professor'])

const formatLocalDateTime = (isoString) => {
  const date = new Date(isoString)
  const tzOffset = date.getTimezoneOffset() * 60000
  const localIso = new Date(date - tzOffset).toISOString().slice(0, 16)
  return localIso
}

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

function SectionCard({ title, description, children }) {
  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  )
}

function StatusMessage({ state }) {
  if (!state?.message && !state?.error) {
    return null
  }

  return (
    <div className={`${styles.statusBlock} ${state.error ? styles.error : styles.success}`} role="status" aria-live="polite">
      <span>{state.error || state.message}</span>
    </div>
  )
}

function StatusBlock({ title, message, type }) {
  if (!message) return null
  return (
    <div className={`${styles.statusBlock} ${type === 'error' ? styles.error : styles.success}`}>
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  )
}

function GroupLifecyclePage() {
  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : null
  const isTeamLeader = TEAM_LEADER_ROLES.has(user?.role)

  // Group lifecycle state
  const [groupName, setGroupName] = useState('')
  const [leaderUserId, setLeaderUserId] = useState('')
  const [groupIdForMembers, setGroupIdForMembers] = useState('')
  const [memberUserId, setMemberUserId] = useState('')
  const [inviteGroupId, setInviteGroupId] = useState('')
  const [recipientUserId, setRecipientUserId] = useState('')
  const [sanitizationDate, setSanitizationDate] = useState(formatLocalDateTime(new Date().toISOString()))
  const [createdGroup, setCreatedGroup] = useState(null)
  const [validationResults, setValidationResults] = useState([])
  const [actionLog, setActionLog] = useState([])
  const [groupStatus, setGroupStatus] = useState({ loading: false, message: '', error: '' })
  const [memberStatus, setMemberStatus] = useState({ loading: false, message: '', error: '' })
  const [inviteStatus, setInviteStatus] = useState({ loading: false, message: '', error: '' })
  const [adminStatus, setAdminStatus] = useState({ loading: false, message: '', error: '' })

  // Advisor flow state
  const [groupId, setGroupId] = useState('')
  const [advisors, setAdvisors] = useState([])
  const [advisorState, setAdvisorState] = useState({ loading: false, message: '', error: '' })
  const [selectedAdvisorId, setSelectedAdvisorId] = useState('')
  const [advisorPage, setAdvisorPage] = useState(1)
  const [advisorLimit, setAdvisorLimit] = useState(10)
  const [submitState, setSubmitState] = useState({ loading: false, message: '', error: '' })
  const [requests, setRequests] = useState([])
  const [requestState, setRequestState] = useState({ loading: false, message: '', error: '' })
  const [requestWithdrawLoadingId, setRequestWithdrawLoadingId] = useState('')
  const [withdrawModalTarget, setWithdrawModalTarget] = useState(null)
  const [withdrawState, setWithdrawState] = useState({ loading: false, message: '', error: '' })
  const [committeeGroupId, setCommitteeGroupId] = useState('')
  const [committeeResult, setCommitteeResult] = useState(null)
  const [committeeState, setCommitteeState] = useState({ loading: false, message: '', error: '' })
  const [statusGroupId, setStatusGroupId] = useState('')
  const [groupStatusResult, setGroupStatusResult] = useState(null)
  const [groupStatusState, setGroupStatusState] = useState({ loading: false, message: '', error: '' })

  const selectedAdvisor = useMemo(
    () => advisors.find((advisor) => String(advisor.advisorId || advisor.id) === String(selectedAdvisorId)),
    [advisors, selectedAdvisorId],
  )

  const addLog = (message) => {
    setActionLog((previous) => [message, ...previous].slice(0, 8))
  }

  // Group lifecycle handlers
  const handleCreateGroup = async (event) => {
    event.preventDefault()
    setGroupStatus({ loading: true, message: '', error: '' })
    try {
      const response = await apiClient.post(apiConfig.endpoints.groups, {
        groupName,
        leaderUserId,
      })
      setCreatedGroup(response.data)
      setGroupIdForMembers(response.data.groupId)
      setInviteGroupId(response.data.groupId)
      setGroupStatus({ loading: false, message: `Group created with ID ${response.data.groupId}.`, error: '' })
      addLog(`Created group ${response.data.groupId}`)
      setGroupName('')
    } catch (error) {
      const details = error.response?.data?.message || error.message || 'Unable to create group.'
      setGroupStatus({ loading: false, message: '', error: details })
    }
  }

  const handleAddMember = async (event) => {
    event.preventDefault()
    setMemberStatus({ loading: true, message: '', error: '' })
    try {
      await apiClient.post(apiConfig.endpoints.groupMembers(groupIdForMembers), {
        memberUserId,
      })
      setMemberStatus({ loading: false, message: `Member ${memberUserId} added to group ${groupIdForMembers}.`, error: '' })
      addLog(`Added member ${memberUserId} to group ${groupIdForMembers}`)
      setMemberUserId('')
    } catch (error) {
      const details = error.response?.data?.message || error.message || 'Unable to add member.'
      setMemberStatus({ loading: false, message: '', error: details })
    }
  }

  const handleDeliverInvite = async (event) => {
    event.preventDefault()
    setInviteStatus({ loading: true, message: '', error: '' })
    try {
      const response = await apiClient.post(apiConfig.endpoints.invites, {
        groupId: inviteGroupId,
        recipientUserId,
      })
      setInviteStatus({ loading: false, message: `Invite delivered: ${response.data.notificationId}.`, error: '' })
      addLog(`Delivered invite ${response.data.notificationId}`)
      setRecipientUserId('')
    } catch (error) {
      const details = error.response?.data?.message || error.message || 'Unable to deliver invite.'
      setInviteStatus({ loading: false, message: '', error: details })
    }
  }

  const handleValidateAdvisors = async () => {
    setAdminStatus({ loading: true, message: '', error: '' })
    try {
      const response = await apiClient.get(apiConfig.endpoints.advisorValidation)
      setValidationResults(response.data || [])
      const message = response.data?.length
        ? `${response.data.length} group(s) require advisor validation.`
        : 'All groups have advisor assignments.'
      setAdminStatus({ loading: false, message, error: '' })
      addLog('Validated advisor assignment status')
    } catch (error) {
      const details = error.response?.data?.message || error.message || 'Advisor validation failed.'
      setAdminStatus({ loading: false, message: '', error: details })
    }
  }

  const handleExecuteSanitization = async () => {
    setAdminStatus({ loading: true, message: '', error: '' })
    try {
      const payload = {
        sanitizationRunDateTime: new Date(sanitizationDate).toISOString(),
      }
      await apiClient.post(apiConfig.endpoints.sanitizationExecute, payload)
      setAdminStatus({ loading: false, message: 'Sanitization executed successfully.', error: '' })
      addLog(`Executed sanitization at ${payload.sanitizationRunDateTime}`)
    } catch (error) {
      const details = error.response?.data?.message || error.message || 'Sanitization execution failed.'
      setAdminStatus({ loading: false, message: '', error: details })
    }
  }

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
          <p className={styles.badge}>Group Lifecycle & Advisor Flows</p>
          <h1>Group Management</h1>
          <p className={styles.lead}>
            Create groups, add members, send invites, validate advisors, manage advisor requests, and inspect committee assignments.
          </p>
        </div>
      </header>

      <main className={styles.grid}>
        <SectionCard title="Create a Group" description="Register a new group and capture the generated ID.">
          <form className={styles.form} onSubmit={handleCreateGroup}>
            <label>
              Group Name
              <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Student project group" required />
            </label>
            <EntitySearchSelect
              label="Leader"
              endpoint={apiConfig.endpoints.userSearch}
              searchField="email"
              returnField="_id"
              displayField="email"
              value={leaderUserId}
              onChange={setLeaderUserId}
              placeholder="Search a user by email"
              required
            />
            <button type="submit" disabled={groupStatus.loading}>
              {groupStatus.loading ? 'Creating…' : 'Create Group'}
            </button>
          </form>
          <StatusBlock title="Create Group" message={groupStatus.message} type="success" />
          <StatusBlock title="Create Group" message={groupStatus.error} type="error" />
          {createdGroup && (
            <div className={styles.resultBox}>
              <strong>Created Group</strong>
              <pre>{JSON.stringify(createdGroup, null, 2)}</pre>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Add Member" description="Assign a student to the created or existing group.">
          <form className={styles.form} onSubmit={handleAddMember}>
            <label>
              Group ID
              <input value={groupIdForMembers} onChange={(e) => setGroupIdForMembers(e.target.value)} placeholder="UUID of group" required />
            </label>
            <EntitySearchSelect
              label="Member"
              endpoint={apiConfig.endpoints.userSearch}
              searchField="email"
              returnField="_id"
              displayField="email"
              value={memberUserId}
              onChange={setMemberUserId}
              placeholder="Search a user by email"
              required
            />
            <button type="submit" disabled={memberStatus.loading}>
              {memberStatus.loading ? 'Adding…' : 'Add Member'}
            </button>
          </form>
          <StatusBlock title="Add Member" message={memberStatus.message} type="success" />
          <StatusBlock title="Add Member" message={memberStatus.error} type="error" />
        </SectionCard>

        <SectionCard title="Deliver Invite" description="Send a group invite notification to a student.">
          <form className={styles.form} onSubmit={handleDeliverInvite}>
            <label>
              Group ID
              <input value={inviteGroupId} onChange={(e) => setInviteGroupId(e.target.value)} placeholder="UUID of group" required />
            </label>
            <EntitySearchSelect
              label="Recipient"
              endpoint={apiConfig.endpoints.userSearch}
              searchField="email"
              returnField="_id"
              displayField="email"
              value={recipientUserId}
              onChange={setRecipientUserId}
              placeholder="Search a user by email"
              required
            />
            <button type="submit" disabled={inviteStatus.loading}>
              {inviteStatus.loading ? 'Delivering…' : 'Deliver Invite'}
            </button>
          </form>
          <StatusBlock title="Invite Delivery" message={inviteStatus.message} type="success" />
          <StatusBlock title="Invite Delivery" message={inviteStatus.error} type="error" />
        </SectionCard>

        <SectionCard title="Advisor Validation" description="Check all groups for missing advisor assignments.">
          <div className={styles.inlineControls}>
            <button onClick={handleValidateAdvisors} disabled={adminStatus.loading}>
              {adminStatus.loading ? 'Checking…' : 'Validate Advisors'}
            </button>
          </div>
          <StatusBlock title="Advisor Validation" message={adminStatus.message} type="success" />
          <StatusBlock title="Advisor Validation" message={adminStatus.error} type="error" />
          {validationResults.length > 0 && (
            <div className={styles.resultBox}>
              <strong>Validation Results</strong>
              <ul className={styles.resultList}>
                {validationResults.map((item) => (
                  <li key={item.groupId}>
                    <span>{item.groupId}</span>
                    <small>{item.advisorAssignmentStatus} — deadline {new Date(item.advisorDeadline).toLocaleString()}</small>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Execute Sanitization" description="Disband groups missing advisors and trigger notifications.">
          <div className={styles.form}>
            <label>
              Run Date / Time
              <input
                type="datetime-local"
                value={sanitizationDate}
                onChange={(e) => setSanitizationDate(e.target.value)}
                required
              />
            </label>
            <button type="button" onClick={handleExecuteSanitization} disabled={adminStatus.loading}>
              {adminStatus.loading ? 'Executing…' : 'Run Sanitization'}
            </button>
          </div>
          <StatusBlock title="Sanitization" message={adminStatus.message} type="success" />
          <StatusBlock title="Sanitization" message={adminStatus.error} type="error" />
        </SectionCard>

        <SectionCard title="Advisor List" description="Browse advisors with pagination and choose one for request submission.">
          <div className={styles.inlineControls}>
            <label>
              Page
              <input type="number" min="1" value={advisorPage} onChange={(e) => setAdvisorPage(Number(e.target.value) || 1)} />
            </label>
            <label>
              Limit
              <input type="number" min="1" value={advisorLimit} onChange={(e) => setAdvisorLimit(Number(e.target.value) || 10)} />
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

        <SectionCard title="Submit Advisor Request" description="Team Leader submits selected advisor request for a group.">
          <form className={styles.form} onSubmit={handleSubmitRequest}>
            <label>
              Group ID
              <input value={groupId} onChange={(e) => setGroupId(e.target.value)} required />
            </label>
            <label>
              Selected Advisor
              <input value={selectedAdvisor ? selectedAdvisor.name || selectedAdvisor.fullName || selectedAdvisorId : ''} disabled />
            </label>
            <button type="submit" disabled={!isTeamLeader || !groupId || !selectedAdvisorId || submitState.loading}>
              {submitState.loading ? 'Submitting…' : 'Submit Request'}
            </button>
          </form>
          {!isTeamLeader && <p className={styles.note}>Only Team Leader role can submit advisor requests.</p>}
          <StatusMessage state={submitState} />
        </SectionCard>

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
                      <p className={styles.requestMeta}>Group: {request.groupId || '-'} | Advisor: {request.advisorId || '-'}</p>
                    </div>
                    <div className={styles.requestActions}>
                      <span className={`${styles.badgeStatus} ${pending ? styles.pending : styles.nonPending}`}>
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

        <SectionCard title="Group Assignment Status" description="Shows status, advisor context, canSubmitRequest, and blockedReason.">
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

        <SectionCard title="Activity Log" description="Recent actions performed in the SPA.">
          {actionLog.length === 0 ? (
            <p className={styles.emptyState}>No actions yet. Create a group or run a validation to see activity here.</p>
          ) : (
            <ul className={styles.actionLog}>
              {actionLog.map((entry, index) => (
                <li key={`${entry}-${index}`}>{entry}</li>
              ))}
            </ul>
          )}
        </SectionCard>
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

export default GroupLifecyclePage
