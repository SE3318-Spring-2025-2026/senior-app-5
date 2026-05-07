import { useEffect, useState } from 'react'
import apiClient from '../../utils/apiClient'
import apiConfig from '../../config/api'
import { SectionCard, StatusBlock, Button, PageHeader } from '../../components/ui'
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
    <div className="max-w-4xl mx-auto space-y-5 p-1">
      <PageHeader title="Invites" />

      <SectionCard title="Deliver Invite" description="Send a group invite notification to a student.">
        <form className="space-y-4" onSubmit={handleDeliverInvite}>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              Group ID
            </label>
            <input
              value={inviteGroupId}
              onChange={(e) => setInviteGroupId(e.target.value)}
              placeholder="UUID of group"
              required
              className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              Recipient User ID
            </label>
            <input
              value={recipientUserId}
              onChange={(e) => setRecipientUserId(e.target.value)}
              placeholder="UUID of recipient"
              required
              className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60 disabled:opacity-50"
            />
          </div>
          <Button type="submit" variant="primary" loading={inviteStatus.loading} disabled={inviteStatus.loading}>
            {inviteStatus.loading ? 'Delivering…' : 'Deliver Invite'}
          </Button>
        </form>
        <StatusBlock title="Invite Delivery" message={inviteStatus.message} type="success" />
        <StatusBlock title="Invite Delivery" message={inviteStatus.error} type="error" />
      </SectionCard>
    </div>
  )
}

export default InvitesPage
