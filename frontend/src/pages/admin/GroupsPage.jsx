import { useState, useCallback } from 'react'
import apiClient from '../../utils/apiClient'
import apiConfig from '../../config/api'
import EntitySearchSelect from '../../components/EntitySearchSelect'
import { SectionCard, StatusBlock } from '../../components/ui'
import styles from '../GroupLifecyclePage.module.css'
import { useAdminGroup } from '../../context/AdminGroupContext'

const getApiError = (error) => {
  const message = error?.response?.data?.message
  return Array.isArray(message) ? message.join(', ') : message || error.message || 'Unexpected error.'
}

function StatusBadge({ status }) {
  const upper = String(status || '').toUpperCase()
  const colorMap = {
    ASSIGNED: { background: 'rgba(34,197,94,0.2)', color: '#4ade80' },
    UNASSIGNED: { background: 'rgba(245,158,11,0.2)', color: '#fbbf24' },
    DISBANDED: { background: 'rgba(239,68,68,0.2)', color: '#f87171' },
  }
  const style = colorMap[upper] || { background: 'rgba(100,116,139,0.2)', color: '#94a3b8' }
  return (
    <span
      style={{
        padding: '3px 9px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {upper || 'Unknown'}
    </span>
  )
}

function GroupsPage() {
  const { setCurrentGroupId } = useAdminGroup()

  // Create group
  const [groupName, setGroupName] = useState('')
  const [leaderUserId, setLeaderUserId] = useState('')
  const [createdGroup, setCreatedGroup] = useState(null)
  const [groupStatus, setGroupStatus] = useState({ loading: false, message: '', error: '' })

  // Group list
  const [groups, setGroups] = useState([])
  const [listState, setListState] = useState({ loading: false, message: '', error: '' })

  // Transfer modal
  const [transferModal, setTransferModal] = useState(null)
  const [newAdvisorId, setNewAdvisorId] = useState('')
  const [transferState, setTransferState] = useState({ loading: false, message: '', error: '' })

  // Disband modal
  const [disbandModal, setDisbandModal] = useState(null)
  const [disbandState, setDisbandState] = useState({ loading: false, message: '', error: '' })

  const fetchGroups = useCallback(async () => {
    setListState({ loading: true, message: '', error: '' })
    try {
      const response = await apiClient.get(apiConfig.endpoints.groups)
      const list = response.data?.data || response.data?.items || response.data || []
      setGroups(Array.isArray(list) ? list : [])
      setListState({ loading: false, message: '', error: '' })
    } catch (error) {
      setListState({ loading: false, message: '', error: getApiError(error) })
      setGroups([])
    }
  }, [])

  const handleCreateGroup = async (event) => {
    event.preventDefault()
    setGroupStatus({ loading: true, message: '', error: '' })
    try {
      const response = await apiClient.post(apiConfig.endpoints.groups, {
        groupName,
        leaderUserId,
      })
      setCreatedGroup(response.data)
      setCurrentGroupId(response.data.groupId)
      setGroupStatus({ loading: false, message: `Group created with ID ${response.data.groupId}.`, error: '' })
      setGroupName('')
      setLeaderUserId('')
    } catch (error) {
      const details = error.response?.data?.message || error.message || 'Unable to create group.'
      setGroupStatus({ loading: false, message: '', error: details })
    }
  }

  const openTransferModal = (group) => {
    setNewAdvisorId('')
    setTransferState({ loading: false, message: '', error: '' })
    setTransferModal(group)
  }

  const handleTransfer = async () => {
    if (!transferModal || !newAdvisorId) return
    const groupId = transferModal.groupId || transferModal.id
    const currentAdvisorId = transferModal.advisorUserId || transferModal.advisorId

    setTransferState({ loading: true, message: '', error: '' })
    try {
      await apiClient.patch(apiConfig.endpoints.groupAdvisor(groupId), {
        currentAdvisorId,
        newAdvisorId,
      })
      setTransferState({ loading: false, message: 'Advisor transferred successfully.', error: '' })
      setTransferModal(null)
      await fetchGroups()
    } catch (error) {
      setTransferState({ loading: false, message: '', error: getApiError(error) })
    }
  }

  const openDisbandModal = (group) => {
    setDisbandState({ loading: false, message: '', error: '' })
    setDisbandModal(group)
  }

  const handleDisband = async () => {
    if (!disbandModal) return
    const groupId = disbandModal.groupId || disbandModal.id
    setDisbandState({ loading: true, message: '', error: '' })
    try {
      await apiClient.delete(apiConfig.endpoints.groupDisband(groupId))
      setDisbandState({ loading: false, message: 'Group disbanded.', error: '' })
      setDisbandModal(null)
      await fetchGroups()
    } catch (error) {
      setDisbandState({ loading: false, message: '', error: getApiError(error) })
    }
  }

  return (
    <div className={styles.pageContainer}>
      <SectionCard title="Create a Group" description="Register a new group and capture the generated ID.">
        <form className={styles.form} onSubmit={handleCreateGroup}>
          <label>
            Group Name
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Student project group"
              required
            />
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

      <SectionCard
        title="Group Management"
        description="List all groups. Transfer their advisor or disband unassigned groups."
      >
        <div className={styles.inlineControls} style={{ marginBottom: '16px' }}>
          <button type="button" onClick={fetchGroups} disabled={listState.loading}>
            {listState.loading ? 'Loading…' : 'Load Groups'}
          </button>
        </div>

        {listState.error && (
          <div className={`${styles.statusBlock} ${styles.error}`} role="status">
            {listState.error}
          </div>
        )}

        {groups.length === 0 && !listState.loading ? (
          <p className={styles.emptyState}>No groups loaded. Click "Load Groups" to fetch.</p>
        ) : (
          <ul className={styles.list}>
            {groups.map((group) => {
              const groupId = group.groupId || group.id
              const name = group.groupName || group.name || `Group ${groupId}`
              const status = String(group.status || '').toUpperCase()
              const isAssigned = status === 'ASSIGNED'
              const isUnassigned = status === 'UNASSIGNED'

              return (
                <li key={groupId} className={styles.requestRow}>
                  <div>
                    <strong style={{ color: '#f8fafc' }}>{name}</strong>
                    <p className={styles.requestMeta}>
                      ID: {groupId}
                      {group.advisorUserId || group.advisorId
                        ? ` · Advisor: ${group.advisorUserId || group.advisorId}`
                        : ''}
                    </p>
                  </div>
                  <div className={styles.requestActions}>
                    <StatusBadge status={group.status} />
                    <button
                      type="button"
                      disabled={!isAssigned}
                      title={isAssigned ? 'Transfer to another advisor' : 'Group must be ASSIGNED to transfer'}
                      onClick={() => openTransferModal(group)}
                      style={{
                        padding: '7px 12px',
                        border: 'none',
                        borderRadius: '9px',
                        background: isAssigned ? '#1e40af' : '#334155',
                        color: isAssigned ? '#fff' : '#64748b',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: isAssigned ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Transfer
                    </button>
                    <button
                      type="button"
                      disabled={!isUnassigned}
                      title={isUnassigned ? 'Disband this group' : 'Only UNASSIGNED groups can be disbanded'}
                      onClick={() => openDisbandModal(group)}
                      style={{
                        padding: '7px 12px',
                        border: 'none',
                        borderRadius: '9px',
                        background: isUnassigned ? 'rgba(239,68,68,0.15)' : '#334155',
                        color: isUnassigned ? '#f87171' : '#64748b',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: isUnassigned ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Disband
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>

      {transferModal && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="transfer-modal-title"
        >
          <div className={styles.modal}>
            <h3 id="transfer-modal-title">Transfer Advisor</h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 16px' }}>
              Group: <strong style={{ color: '#f8fafc' }}>
                {transferModal.groupName || transferModal.name || transferModal.groupId || transferModal.id}
              </strong>
            </p>

            <div style={{ display: 'grid', gap: '12px' }}>
              <label style={{ display: 'grid', gap: '6px', fontSize: '14px', color: '#f8fafc' }}>
                Current Advisor ID
                <input
                  disabled
                  value={transferModal.advisorUserId || transferModal.advisorId || '(none)'}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #475569',
                    background: '#1e293b',
                    color: '#64748b',
                    fontSize: '14px',
                  }}
                />
              </label>
              <EntitySearchSelect
                label="New Advisor"
                endpoint={apiConfig.endpoints.advisors}
                searchField="email"
                returnField="advisorId"
                displayField="email"
                value={newAdvisorId}
                onChange={setNewAdvisorId}
                placeholder="Search advisor by email"
              />
            </div>

            {transferState.error && (
              <div
                className={`${styles.statusBlock} ${styles.error}`}
                style={{ marginTop: '12px' }}
                role="status"
              >
                {transferState.error}
              </div>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setTransferModal(null)}
                disabled={transferState.loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTransfer}
                disabled={transferState.loading || !newAdvisorId}
              >
                {transferState.loading ? 'Transferring…' : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {disbandModal && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="disband-modal-title"
        >
          <div className={styles.modal}>
            <h3 id="disband-modal-title" style={{ color: '#f87171' }}>Disband Group</h3>
            <p>
              Are you sure you want to disband{' '}
              <strong>
                {disbandModal.groupName || disbandModal.name || disbandModal.groupId || disbandModal.id}
              </strong>
              ? This action cannot be undone.
            </p>

            {disbandState.error && (
              <div
                className={`${styles.statusBlock} ${styles.error}`}
                style={{ marginTop: '12px' }}
                role="status"
              >
                {disbandState.error}
              </div>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setDisbandModal(null)}
                disabled={disbandState.loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisband}
                disabled={disbandState.loading}
                style={{ background: '#991b1b' }}
              >
                {disbandState.loading ? 'Disbanding…' : 'Confirm Disband'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GroupsPage
