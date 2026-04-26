import { useState } from 'react'
import apiClient from '../../utils/apiClient'
import apiConfig from '../../config/api'
import EntitySearchSelect from '../../components/EntitySearchSelect'
import { SectionCard, StatusBlock } from '../../components/ui'
import styles from '../GroupLifecyclePage.module.css'
import { useAdminGroup } from '../../context/AdminGroupContext'

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
    </div>
  )
}

export default GroupsPage
