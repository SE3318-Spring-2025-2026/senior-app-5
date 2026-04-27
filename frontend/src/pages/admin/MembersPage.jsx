import { useEffect, useState } from 'react'
import apiClient from '../../utils/apiClient'
import apiConfig from '../../config/api'
import EntitySearchSelect from '../../components/EntitySearchSelect'
import { SectionCard, StatusBlock } from '../../components/ui'
import styles from '../GroupLifecyclePage.module.css'
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
