import { useEffect, useState } from 'react'
import apiClient from '../../utils/apiClient'
import apiConfig from '../../config/api'
import EntitySearchSelect from '../../components/EntitySearchSelect'
import { SectionCard, StatusBlock, Button, PageHeader } from '../../components/ui'
import { useAdminGroup } from '../../context/AdminGroupContext'

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
    <div className="max-w-4xl mx-auto space-y-5 p-1">
      <PageHeader title="Members" />

      <SectionCard title="Add Member" description="Assign a student to the created or existing group.">
        <form className="space-y-4" onSubmit={handleAddMember}>
          <EntitySearchSelect
            label="Group"
            endpoint={apiConfig.endpoints.groups}
            searchField="groupName"
            returnField="groupId"
            displayField="groupName"
            value={groupIdForMembers}
            onChange={setGroupIdForMembers}
            placeholder="Search group by name"
            required
          />
          <EntitySearchSelect
            label="Member"
            endpoint={apiConfig.endpoints.userSearch}
            searchField="email"
            returnField="_id"
            displayField="email"
            value={memberUserId}
            onChange={setMemberUserId}
            placeholder="Search user by email"
            required
          />
          <Button type="submit" variant="primary" loading={memberStatus.loading} disabled={memberStatus.loading}>
            {memberStatus.loading ? 'Adding…' : 'Add Member'}
          </Button>
        </form>
        <StatusBlock title="Add Member" message={memberStatus.message} type="success" />
        <StatusBlock title="Add Member" message={memberStatus.error} type="error" />
      </SectionCard>
    </div>
  )
}

export default MembersPage
