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

function InvitesPage() {
  const { currentGroupId } = useAdminGroup()
  const [inviteGroupId, setInviteGroupId] = useState(currentGroupId || '')
  const [recipientUserId, setRecipientUserId] = useState('')
  const [inviteStatus, setInviteStatus] = useState({ loading: false, message: '', error: '' })

  useEffect(() => {
    if (currentGroupId) {
      setInviteGroupId(currentGroupId)
    }
  }, [currentGroupId])

  const handleDeliverInvite = async (event) => {
    event.preventDefault()
    setInviteStatus({ loading: true, message: '', error: '' })
    try {
      const response = await apiClient.post(apiConfig.endpoints.invites, {
        groupId: inviteGroupId,
        recipientUserId,
      })
      setInviteStatus({
        loading: false,
        message: `Invite delivered: ${response.data.notificationId}.`,
        error: '',
      })
      setRecipientUserId('')
    } catch (error) {
      const details = error.response?.data?.message || error.message || 'Unable to deliver invite.'
      setInviteStatus({ loading: false, message: '', error: details })
    }
  }

  return (
    <div className={styles.pageContainer}>
      <SectionCard title="Deliver Invite" description="Send a group invite notification to a student.">
        <form className={styles.form} onSubmit={handleDeliverInvite}>
          <label>
            Group ID
            <input
              value={inviteGroupId}
              onChange={(e) => setInviteGroupId(e.target.value)}
              placeholder="UUID of group"
              required
            />
          </label>
          <label>
            Recipient User ID
            <input
              value={recipientUserId}
              onChange={(e) => setRecipientUserId(e.target.value)}
              placeholder="UUID of recipient"
              required
            />
          </label>
          <button type="submit" disabled={inviteStatus.loading}>
            {inviteStatus.loading ? 'Delivering…' : 'Deliver Invite'}
          </button>
        </form>
        <StatusBlock title="Invite Delivery" message={inviteStatus.message} type="success" />
        <StatusBlock title="Invite Delivery" message={inviteStatus.error} type="error" />
      </SectionCard>
    </div>
  )
}

export default InvitesPage
