import { useState } from 'react'
import apiClient from '../../utils/apiClient'
import apiConfig from '../../config/api'
import styles from '../GroupLifecyclePage.module.css'
import { useAdminGroup } from '../../context/AdminGroupContext'

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

function GroupsPage() {
  const { setCurrentGroupId } = useAdminGroup()
  const [groupName, setGroupName] = useState('')
  const [leaderUserId, setLeaderUserId] = useState('')
  const [createdGroup, setCreatedGroup] = useState(null)
  const [groupStatus, setGroupStatus] = useState({ loading: false, message: '', error: '' })

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
          <label>
            Leader User ID
            <input
              value={leaderUserId}
              onChange={(e) => setLeaderUserId(e.target.value)}
              placeholder="UUID like user-1234"
              required
            />
          </label>
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
    </div>
  )
}

export default GroupsPage
