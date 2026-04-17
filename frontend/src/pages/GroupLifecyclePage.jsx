import { useState } from 'react'
import apiClient from '../utils/apiClient'
import apiConfig from '../config/api'
import EntitySearchSelect from '../components/EntitySearchSelect'
import styles from './GroupLifecyclePage.module.css'

const formatLocalDateTime = (isoString) => {
  const date = new Date(isoString)
  const tzOffset = date.getTimezoneOffset() * 60000
  const localIso = new Date(date - tzOffset).toISOString().slice(0, 16)
  return localIso
}

function SectionCard({ title, description, children }) {
  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className={styles.sectionBody}>{children}</div>
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

  const addLog = (message) => {
    setActionLog((previous) => [message, ...previous].slice(0, 8))
  }

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
n        ? `${response.data.length} group(s) require advisor validation.`
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

  return (
    <div className={styles.pageContainer}>
      <header className={styles.hero}>
        <div>
          <p className={styles.badge}>Process 3 SPA</p>
          <h1>Group Lifecycle & Sanitization</h1>
          <p className={styles.lead}>
            Create groups, add members, send invites, validate advisors, and execute sanitization without reloading the page.
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
          <div className={styles.controlRow}>
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
    </div>
  )
}

export default GroupLifecyclePage
