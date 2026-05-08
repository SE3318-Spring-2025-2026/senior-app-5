import { useEffect, useState } from 'react'
import apiClient from '../../utils/apiClient'
import apiConfig from '../../config/api'
import EntitySearchSelect from '../../components/EntitySearchSelect'
import { SectionCard, StatusBlock } from '../../components/ui'
import styles from '../GroupLifecyclePage.module.css'
import { useAdminGroup } from '../../context/AdminGroupContext'

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
          <EntitySearchSelect
            label="Group"
            endpoint={apiConfig.endpoints.groups}
            buildParams={(q) => ({ name: q, page: 1, limit: 20 })}
            getItems={(res) => res.data}
            returnField="groupId"
            displayField="groupName"
            value={inviteGroupId}
            onChange={setInviteGroupId}
            placeholder="Search group by name"
            required
          />
          <EntitySearchSelect
            label="Recipient"
            endpoint={apiConfig.endpoints.userSearch}
            searchField="email"
            returnField="_id"
            displayField="email"
            value={recipientUserId}
            onChange={setRecipientUserId}
            placeholder="Search recipient by email"
            required
          />
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
