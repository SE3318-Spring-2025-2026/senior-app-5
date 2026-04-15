import { useEffect, useState } from 'react'
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

function MembersPage() {
  const { currentGroupId } = useAdminGroup()
  const [groupIdForMembers, setGroupIdForMembers] = useState(currentGroupId || '')
  const [memberUserId, setMemberUserId] = useState('')
  const [memberStatus, setMemberStatus] = useState({ loading: false, message: '', error: '' })

  useEffect(() => {
    if (currentGroupId) {
      setGroupIdForMembers(currentGroupId)
    }
  }, [currentGroupId])

  const handleAddMember = async (event) => {
    event.preventDefault()
    setMemberStatus({ loading: true, message: '', error: '' })
    try {
      await apiClient.post(apiConfig.endpoints.groupMembers(groupIdForMembers), {
        memberUserId,
      })

      setMemberStatus({
        loading: false,
        message: `Member ${memberUserId} successfully assigned to group ${groupIdForMembers}.`,
        error: '',
      })
      setMemberUserId('')
    } catch (error) {
      const details = error.response?.data?.message || error.message || 'Unable to add member.'
      setMemberStatus({ loading: false, message: '', error: details })
    }
  }

  return (
    <div className={styles.pageContainer}>
      <SectionCard title="Add Member" description="Assign a student to the created or existing group.">
        <form className={styles.form} onSubmit={handleAddMember}>
          <label>
            Group ID
            <input
              value={groupIdForMembers}
              onChange={(e) => setGroupIdForMembers(e.target.value)}
              placeholder="UUID of group"
              required
            />
          </label>
          <label>
            Member User ID
            <input
              value={memberUserId}
              onChange={(e) => setMemberUserId(e.target.value)}
              placeholder="UUID of member"
              required
            />
          </label>
          <button type="submit" disabled={memberStatus.loading}>
            {memberStatus.loading ? 'Adding…' : 'Add Member'}
          </button>
        </form>
        <StatusBlock title="Add Member" message={memberStatus.message} type="success" />
        <StatusBlock title="Add Member" message={memberStatus.error} type="error" />
      </SectionCard>
    </div>
  )
}

export default MembersPage
