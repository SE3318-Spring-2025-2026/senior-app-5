import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../utils/apiClient'
import apiConfig from '../../config/api'
import EntitySearchSelect from '../../components/EntitySearchSelect'
import { SectionCard, StatusBlock, Badge, Button, PageHeader } from '../../components/ui'
import { useAdminGroup } from '../../context/AdminGroupContext'

const PAGE_LIMIT = 15

const getApiError = (error) => {
  const message = error?.response?.data?.message
  return Array.isArray(message) ? message.join(', ') : message || error.message || 'Unexpected error.'
}

function StatusBadge({ status }) {
  const upper = String(status || '').toUpperCase()
  const colorMap = { ASSIGNED: 'green', UNASSIGNED: 'yellow', DISBANDED: 'red' }
  const color = colorMap[upper] || 'slate'
  return <Badge color={color}>{upper || 'Unknown'}</Badge>
}

function GroupsPage() {
  const { setCurrentGroupId } = useAdminGroup()
  const navigate = useNavigate()

  const [groupName, setGroupName] = useState('')
  const [leaderUserId, setLeaderUserId] = useState('')
  const [groupStatus, setGroupStatus] = useState({ loading: false, message: '', error: '' })

  const [groups, setGroups] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [listState, setListState] = useState({ loading: true, error: '' })

  const [transferModal, setTransferModal] = useState(null)
  const [newAdvisorId, setNewAdvisorId] = useState('')
  const [transferState, setTransferState] = useState({ loading: false, message: '', error: '' })

  const [disbandModal, setDisbandModal] = useState(null)
  const [disbandState, setDisbandState] = useState({ loading: false, message: '', error: '' })

  const [releaseModal, setReleaseModal] = useState(null)
  const [releaseState, setReleaseState] = useState({ loading: false, error: '' })

  const fetchGroups = useCallback(async (p = 1) => {
    setListState({ loading: true, error: '' })
    try {
      const response = await apiClient.get(apiConfig.endpoints.groups, {
        params: { page: p, limit: PAGE_LIMIT },
      })
      const body = response.data
      const list = body.data || body.items || body || []
      setGroups(Array.isArray(list) ? list : [])
      const total = body.total ?? list.length
      setTotalPages(Math.max(1, Math.ceil(total / PAGE_LIMIT)))
      setPage(p)
      setListState({ loading: false, error: '' })
    } catch (error) {
      setListState({ loading: false, error: getApiError(error) })
      setGroups([])
    }
  }, [])

  useEffect(() => {
    fetchGroups(1)
  }, [fetchGroups])

  const handleCreateGroup = async (event) => {
    event.preventDefault()
    setGroupStatus({ loading: true, message: '', error: '' })
    try {
      const response = await apiClient.post(apiConfig.endpoints.groups, {
        groupName,
        leaderUserId,
      })
      setCurrentGroupId(response.data.groupId)
      setGroupStatus({ loading: false, message: `Group "${response.data.groupName}" created.`, error: '' })
      setGroupName('')
      setLeaderUserId('')
      await fetchGroups(1)
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
    const currentAdvisorId = transferModal.assignedAdvisorId || transferModal.advisorUserId || transferModal.advisorId

    setTransferState({ loading: true, message: '', error: '' })
    try {
      await apiClient.patch(apiConfig.endpoints.groupAdvisor(groupId), {
        currentAdvisorId,
        newAdvisorId,
      })
      setTransferState({ loading: false, message: 'Advisor transferred successfully.', error: '' })
      setTransferModal(null)
      await fetchGroups(page)
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
      await fetchGroups(page)
    } catch (error) {
      setDisbandState({ loading: false, message: '', error: getApiError(error) })
    }
  }

  const openReleaseModal = (group) => {
    setReleaseState({ loading: false, error: '' })
    setReleaseModal(group)
  }

  const handleRelease = async () => {
    if (!releaseModal) return
    const groupId = releaseModal.groupId || releaseModal.id
    const advisorId = releaseModal.assignedAdvisorId
    if (!advisorId) {
      setReleaseState({ loading: false, error: 'No advisor assigned to this group.' })
      return
    }
    setReleaseState({ loading: true, error: '' })
    try {
      await apiClient.delete(apiConfig.endpoints.releaseAdvisor(advisorId, groupId))
      setReleaseModal(null)
      await fetchGroups(page)
    } catch (error) {
      setReleaseState({ loading: false, error: getApiError(error) })
    }
  }

  const goTo = (p) => fetchGroups(p)

  return (
    <div className="max-w-4xl mx-auto space-y-5 p-1">
      <PageHeader title="Groups" />

      <SectionCard title="Create a Group" description="Register a new group and capture the generated ID.">
        <form className="space-y-4" onSubmit={handleCreateGroup}>
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Group Name
            </label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Student project group"
              required
              className="w-full rounded-md border border-[#26262b] bg-[#0a0a0b] px-3.5 py-2.5 text-[13px] text-zinc-200 focus:border-[#3a3a40] focus:outline-none focus:ring-1 focus:ring-[#3a3a40] disabled:opacity-50"
            />
          </div>
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
          <Button type="submit" variant="primary" loading={groupStatus.loading} disabled={groupStatus.loading}>
            {groupStatus.loading ? 'Creating…' : 'Create Group'}
          </Button>
        </form>
        <StatusBlock title="Create Group" message={groupStatus.message} type="success" />
        <StatusBlock title="Create Group" message={groupStatus.error} type="error" />
      </SectionCard>

      <SectionCard
        title="Group Management"
        description="All groups. Transfer their advisor, view details, or disband unassigned groups."
      >
        {listState.error && (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-[13px] text-rose-300" role="status">
            {listState.error}
          </div>
        )}

        {listState.loading ? (
          <div className="py-12 text-center text-[13px] text-zinc-600">Loading groups…</div>
        ) : groups.length === 0 ? (
          <p className="py-12 text-center text-[13px] text-zinc-600">No groups found.</p>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-[#1f1f23]">
              <table className="w-full">
                <thead className="bg-[#0e0e10]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Name</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Status</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => {
                    const groupId = group.groupId || group.id
                    const name = group.groupName || group.name || `Group ${groupId}`
                    const isDisbanded = String(group.status || '').toUpperCase() === 'DISBANDED'
                    const assignmentStatus = String(group.assignmentStatus || '').toUpperCase()
                    const isAssigned = !isDisbanded && assignmentStatus === 'ASSIGNED'
                    const isUnassigned = !isDisbanded && assignmentStatus === 'UNASSIGNED'
                    const badgeStatus = isDisbanded ? 'DISBANDED' : group.assignmentStatus

                    return (
                      <tr key={groupId} className="border-t border-[#1f1f23] hover:bg-[#18181c]">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/admin/groups/${groupId}`)}
                            className="text-left text-[13px] font-medium text-zinc-300 transition-colors hover:text-zinc-100"
                          >
                            {name}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-zinc-300">
                          <StatusBadge status={badgeStatus} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={!isAssigned}
                              title={isAssigned ? 'Transfer to another advisor' : 'Group must be ASSIGNED to transfer'}
                              onClick={() => openTransferModal(group)}
                            >
                              Transfer
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={!isAssigned}
                              title={isAssigned ? 'Release advisor from this group' : 'Group must be ASSIGNED to release'}
                              onClick={() => openReleaseModal(group)}
                            >
                              Release
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              disabled={!isUnassigned}
                              title={isUnassigned ? 'Disband this group' : 'Only UNASSIGNED groups can be disbanded'}
                              onClick={() => openDisbandModal(group)}
                            >
                              Disband
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-[#1f1f23] pt-4">
                <button
                  onClick={() => goTo(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="text-xs text-zinc-500 transition-colors hover:text-zinc-300 disabled:opacity-40"
                >
                  ← Prev
                </button>
                <span className="text-xs text-zinc-600">{page} / {totalPages}</span>
                <button
                  onClick={() => goTo(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="text-xs text-zinc-500 transition-colors hover:text-zinc-300 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </SectionCard>

      {transferModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="transfer-modal-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#1f1f23] bg-[#131316] p-6 shadow-2xl">
            <h3 id="transfer-modal-title" className="mb-1 text-base font-semibold text-zinc-100">
              Transfer Advisor
            </h3>
            <p className="mb-5 text-[13px] text-zinc-500">
              Group:{' '}
              <strong className="text-zinc-200">
                {transferModal.groupName || transferModal.name || transferModal.groupId || transferModal.id}
              </strong>
            </p>

            <div className="space-y-4">
              <EntitySearchSelect
                label="New Advisor"
                endpoint={apiConfig.endpoints.advisors}
                searchField="email"
                returnField="advisorId"
                displayField="email"
                value={newAdvisorId}
                onChange={setNewAdvisorId}
                placeholder="Search advisor by email"
                buildParams={(q) => ({ email: q })}
                getItems={(res) => res.data || []}
              />
            </div>

            {transferState.error && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-[13px] text-rose-300" role="status">
                {transferState.error}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setTransferModal(null)}
                disabled={transferState.loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleTransfer}
                loading={transferState.loading}
                disabled={transferState.loading || !newAdvisorId}
              >
                {transferState.loading ? 'Transferring…' : 'Confirm Transfer'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {disbandModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="disband-modal-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#1f1f23] bg-[#131316] p-6 shadow-2xl">
            <h3 id="disband-modal-title" className="mb-2 text-base font-semibold text-rose-400">
              Disband Group
            </h3>
            <p className="mb-4 text-[13px] text-zinc-400">
              Are you sure you want to disband{' '}
              <strong className="text-zinc-200">
                {disbandModal.groupName || disbandModal.name || disbandModal.groupId || disbandModal.id}
              </strong>
              ? This action cannot be undone.
            </p>

            {disbandState.error && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-[13px] text-rose-300" role="status">
                {disbandState.error}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDisbandModal(null)}
                disabled={disbandState.loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDisband}
                loading={disbandState.loading}
                disabled={disbandState.loading}
              >
                {disbandState.loading ? 'Disbanding…' : 'Confirm Disband'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {releaseModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="release-modal-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#1f1f23] bg-[#131316] p-6 shadow-2xl">
            <h3 id="release-modal-title" className="mb-2 text-base font-semibold text-amber-400">
              Release Advisor
            </h3>
            <p className="mb-4 text-[13px] text-zinc-400">
              Remove the advisor from{' '}
              <strong className="text-zinc-200">
                {releaseModal.groupName || releaseModal.name || releaseModal.groupId || releaseModal.id}
              </strong>
              ? The group will become unassigned and can then be disbanded.
            </p>

            {releaseState.error && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-[13px] text-rose-300" role="status">
                {releaseState.error}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setReleaseModal(null)}
                disabled={releaseState.loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleRelease}
                loading={releaseState.loading}
                disabled={releaseState.loading}
              >
                {releaseState.loading ? 'Releasing…' : 'Confirm Release'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GroupsPage
