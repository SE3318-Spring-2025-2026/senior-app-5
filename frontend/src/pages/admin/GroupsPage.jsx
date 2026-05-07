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
    const currentAdvisorId = transferModal.advisorUserId || transferModal.advisorId

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

  const goTo = (p) => fetchGroups(p)

  return (
    <div className="max-w-4xl mx-auto space-y-5 p-1">
      <PageHeader title="Groups" />

      <SectionCard title="Create a Group" description="Register a new group and capture the generated ID.">
        <form className="space-y-4" onSubmit={handleCreateGroup}>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              Group Name
            </label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Student project group"
              required
              className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60 disabled:opacity-50"
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
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 mb-3" role="status">
            {listState.error}
          </div>
        )}

        {listState.loading ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading groups…</div>
        ) : groups.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">No groups found.</p>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-[#1e293b]">
              <table className="w-full">
                <thead className="bg-[#080f1f]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Name</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => {
                    const groupId = group.groupId || group.id
                    const name = group.groupName || group.name || `Group ${groupId}`
                    const status = String(group.status || '').toUpperCase()
                    const isAssigned = status === 'ASSIGNED'
                    const isUnassigned = status === 'UNASSIGNED'

                    return (
                      <tr key={groupId} className="border-t border-[#1e293b] hover:bg-white/2">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/admin/groups/${groupId}`)}
                            className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors text-left"
                          >
                            {name}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          <StatusBadge status={group.status} />
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
              <div className="mt-4 flex items-center justify-between border-t border-[#1e293b] pt-4">
                <button
                  onClick={() => goTo(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="text-xs text-slate-400 transition-colors hover:text-slate-200 disabled:opacity-40"
                >
                  ← Prev
                </button>
                <span className="text-xs text-slate-500">{page} / {totalPages}</span>
                <button
                  onClick={() => goTo(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="text-xs text-slate-400 transition-colors hover:text-slate-200 disabled:opacity-40"
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
          <div className="w-full max-w-sm rounded-2xl border border-[#1e293b] bg-[#0d1729] p-6 shadow-2xl">
            <h3 id="transfer-modal-title" className="text-base font-bold text-slate-200 mb-1">
              Transfer Advisor
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              Group:{' '}
              <strong className="text-slate-200">
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
              />
            </div>

            {transferState.error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 mt-3" role="status">
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
          <div className="w-full max-w-sm rounded-2xl border border-[#1e293b] bg-[#0d1729] p-6 shadow-2xl">
            <h3 id="disband-modal-title" className="text-base font-bold text-red-400 mb-2">
              Disband Group
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Are you sure you want to disband{' '}
              <strong className="text-slate-200">
                {disbandModal.groupName || disbandModal.name || disbandModal.groupId || disbandModal.id}
              </strong>
              ? This action cannot be undone.
            </p>

            {disbandState.error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 mt-3" role="status">
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
    </div>
  )
}

export default GroupsPage
