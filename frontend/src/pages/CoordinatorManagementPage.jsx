import { useCallback, useEffect, useMemo, useState } from 'react'
import { createSchedule, getActiveSchedule } from '../utils/scheduleService'
import {
  addAdvisor,
  addJuryMember,
  assignCommitteeGroup,
  createCommittee,
  deleteCommittee,
  getCommittee,
  listAdvisors,
  listCommitteeGroups,
  listCommittees,
  listJuryMembers,
  removeAdvisor,
  removeCommitteeGroup,
  removeJuryMember,
  updateCommittee,
} from '../utils/committeeService'
import { useAuth } from '../context/AuthContext'
import { CreateCoordinatorForm } from '../components/CreateCoordinatorForm'
import { SectionCard } from '../components/ui'

const labelClass = 'block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5'
const inputClass =
  'w-full rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60 disabled:opacity-50'
const btnPrimary =
  'rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed'
const btnGhost =
  'rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm font-bold text-slate-300 hover:border-slate-600 hover:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed'
const btnDanger =
  'rounded-xl border border-red-500/30 bg-red-600/10 text-sm font-bold text-red-400 px-4 py-2.5 hover:bg-red-600/20'

const emptyStatus = () => ({ message: '', error: '' })
const TAB_KEYS = ['jury', 'advisors', 'groups']

const toList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

const toPagination = (payload) => ({
  total: payload?.total ?? payload?.meta?.total ?? null,
  page: payload?.page ?? payload?.meta?.page ?? null,
  limit: payload?.limit ?? payload?.meta?.limit ?? null,
})

const fromDateInput = (value) => new Date(value).toISOString()

function StatusMessage({ status }) {
  if (!status.message && !status.error) return null

  if (status.error) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 mt-3"
      >
        {status.error}
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-400 mt-3"
    >
      {status.message}
    </div>
  )
}

function CoordinatorManagementPage() {
  const { user } = useAuth()

  const activeRole = useMemo(() => {
    if (user?.role) return String(user.role).toUpperCase()

    try {
      const token = localStorage.getItem('token')
      if (!token) return null

      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const payload = JSON.parse(window.atob(base64))

      return payload.role ? String(payload.role).toUpperCase() : null
    } catch (error) {
      console.error('Token okunamadı:', error)
      return null
    }
  }, [user])

  const [scheduleForm, setScheduleForm] = useState({ phase: '', startAt: '', endAt: '' })
  const [scheduleStatus, setScheduleStatus] = useState(emptyStatus())
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [activeSchedule, setActiveSchedule] = useState(null)

  const [filters, setFilters] = useState({ name: '', page: 1, limit: 10 })
  const [committeeStatus, setCommitteeStatus] = useState(emptyStatus())
  const [committeeLoading, setCommitteeLoading] = useState(false)
  const [committees, setCommittees] = useState([])
  const [pagination, setPagination] = useState({ total: null, page: 1, limit: 10 })

  const [committeeForm, setCommitteeForm] = useState({ name: '' })
  const [editingCommitteeId, setEditingCommitteeId] = useState(null)
  const [selectedCommitteeId, setSelectedCommitteeId] = useState('')

  const [detailStatus, setDetailStatus] = useState(emptyStatus())
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedCommittee, setSelectedCommittee] = useState(null)

  const [activeTab, setActiveTab] = useState('jury')
  const [tabLoading, setTabLoading] = useState(false)
  const [tabStatus, setTabStatus] = useState(emptyStatus())
  const [juryMembers, setJuryMembers] = useState([])
  const [advisors, setAdvisors] = useState([])
  const [assignedGroups, setAssignedGroups] = useState([])
  const [juryInput, setJuryInput] = useState('')
  const [advisorInput, setAdvisorInput] = useState('')
  const [groupInput, setGroupInput] = useState('')

  const loadActiveSchedule = useCallback(async () => {
    setScheduleLoading(true)
    setScheduleStatus(emptyStatus())
    try {
      const data = await getActiveSchedule()
      setActiveSchedule(data)
      setScheduleStatus({ message: 'Active schedule loaded successfully.', error: '' })
    } catch (error) {
      setScheduleStatus({ message: '', error: `(${error.status ?? 'N/A'}) ${error.message}` })
      setActiveSchedule(null)
    } finally {
      setScheduleLoading(false)
    }
  }, [])

  const loadCommittees = useCallback(async () => {
    setCommitteeLoading(true)
    setCommitteeStatus(emptyStatus())
    try {
      const payload = await listCommittees(filters)
      setCommittees(toList(payload))
      setPagination(toPagination(payload))
    } catch (error) {
      setCommitteeStatus({ message: '', error: `(${error.status ?? 'N/A'}) ${error.message}` })
      setCommittees([])
    } finally {
      setCommitteeLoading(false)
    }
  }, [filters])

  const loadCommitteeDetails = useCallback(async (committeeId) => {
    if (!committeeId) return
    setDetailLoading(true)
    setDetailStatus(emptyStatus())
    try {
      const data = await getCommittee(committeeId)
      setSelectedCommittee(data)
    } catch (error) {
      setDetailStatus({ message: '', error: `(${error.status ?? 'N/A'}) ${error.message}` })
      setSelectedCommittee(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const loadTabData = useCallback(async (committeeId, tabKey) => {
    if (!committeeId || !TAB_KEYS.includes(tabKey)) return
    setTabLoading(true)
    setTabStatus(emptyStatus())
    try {
      if (tabKey === 'jury') setJuryMembers(toList(await listJuryMembers(committeeId)))
      if (tabKey === 'advisors') setAdvisors(toList(await listAdvisors(committeeId)))
      if (tabKey === 'groups') setAssignedGroups(toList(await listCommitteeGroups(committeeId)))
    } catch (error) {
      setTabStatus({ message: '', error: `(${error.status ?? 'N/A'}) ${error.message}` })
      if (tabKey === 'jury') setJuryMembers([])
      if (tabKey === 'advisors') setAdvisors([])
      if (tabKey === 'groups') setAssignedGroups([])
    } finally {
      setTabLoading(false)
    }
  }, [])

  useEffect(() => {
    loadActiveSchedule()
  }, [loadActiveSchedule])

  useEffect(() => {
    loadCommittees()
  }, [loadCommittees])

  useEffect(() => {
    if (!selectedCommitteeId) return
    loadCommitteeDetails(selectedCommitteeId)
    loadTabData(selectedCommitteeId, activeTab)
  }, [selectedCommitteeId, activeTab, loadCommitteeDetails, loadTabData])

  const onCreateSchedule = async (event) => {
    event.preventDefault()
    setScheduleStatus(emptyStatus())

    if (!scheduleForm.phase.trim()) {
      setScheduleStatus({ message: '', error: 'Phase is required.' })
      return
    }
    if (!scheduleForm.startAt || !scheduleForm.endAt) {
      setScheduleStatus({ message: '', error: 'Start and end date are required.' })
      return
    }
    if (new Date(scheduleForm.startAt) >= new Date(scheduleForm.endAt)) {
      setScheduleStatus({ message: '', error: 'End date must be after start date.' })
      return
    }

    setScheduleLoading(true)
    try {
      await createSchedule({
        phase: scheduleForm.phase.trim(),
        startAt: fromDateInput(scheduleForm.startAt),
        endAt: fromDateInput(scheduleForm.endAt),
      })
      setScheduleStatus({ message: 'Schedule created successfully.', error: '' })
      await loadActiveSchedule()
    } catch (error) {
      setScheduleStatus({ message: '', error: `(${error.status ?? 'N/A'}) ${error.message}` })
    } finally {
      setScheduleLoading(false)
    }
  }

  const onSubmitCommittee = async (event) => {
    event.preventDefault()
    if (!committeeForm.name.trim()) {
      setCommitteeStatus({ message: '', error: 'Committee name is required.' })
      return
    }

    setCommitteeStatus(emptyStatus())
    setCommitteeLoading(true)
    try {
      if (editingCommitteeId) {
        await updateCommittee(editingCommitteeId, { name: committeeForm.name.trim() })
        setCommitteeStatus({ message: 'Committee updated successfully.', error: '' })
      } else {
        await createCommittee({ name: committeeForm.name.trim() })
        setCommitteeStatus({ message: 'Committee created successfully.', error: '' })
      }
      setCommitteeForm({ name: '' })
      setEditingCommitteeId(null)
      await loadCommittees()
    } catch (error) {
      setCommitteeStatus({ message: '', error: `(${error.status ?? 'N/A'}) ${error.message}` })
    } finally {
      setCommitteeLoading(false)
    }
  }

  const onDeleteCommittee = async (committeeId) => {
    if (!committeeId) return
    const approved = window.confirm('Delete this committee?')
    if (!approved) return

    setCommitteeStatus(emptyStatus())
    setCommitteeLoading(true)
    try {
      await deleteCommittee(committeeId)
      setCommitteeStatus({ message: 'Committee deleted successfully.', error: '' })
      if (selectedCommitteeId === committeeId) {
        setSelectedCommitteeId('')
        setSelectedCommittee(null)
      }
      await loadCommittees()
    } catch (error) {
      setCommitteeStatus({ message: '', error: `(${error.status ?? 'N/A'}) ${error.message}` })
    } finally {
      setCommitteeLoading(false)
    }
  }

  const onAddRelation = async (event) => {
    event.preventDefault()
    if (!selectedCommitteeId) return

    setTabStatus(emptyStatus())
    setTabLoading(true)
    try {
      if (activeTab === 'jury') {
        if (!juryInput.trim()) {
          setTabStatus({ message: '', error: '(422) Jury user id is required.' })
          return
        }
        await addJuryMember(selectedCommitteeId, juryInput.trim())
        setJuryInput('')
      }
      if (activeTab === 'advisors') {
        if (!advisorInput.trim()) {
          setTabStatus({ message: '', error: '(422) Advisor user id is required.' })
          return
        }
        await addAdvisor(selectedCommitteeId, advisorInput.trim())
        setAdvisorInput('')
      }
      if (activeTab === 'groups') {
        if (!groupInput.trim()) {
          setTabStatus({ message: '', error: '(422) Group id is required.' })
          return
        }
        await assignCommitteeGroup(selectedCommitteeId, groupInput.trim())
        setGroupInput('')
      }

      setTabStatus({ message: 'Assignment completed successfully.', error: '' })
      await loadTabData(selectedCommitteeId, activeTab)
    } catch (error) {
      setTabStatus({ message: '', error: `(${error.status ?? 'N/A'}) ${error.message}` })
    } finally {
      setTabLoading(false)
    }
  }

  const onRemoveRelation = async (id) => {
    if (!selectedCommitteeId || !id) return

    setTabStatus(emptyStatus())
    setTabLoading(true)
    try {
      if (activeTab === 'jury') await removeJuryMember(selectedCommitteeId, id)
      if (activeTab === 'advisors') await removeAdvisor(selectedCommitteeId, id)
      if (activeTab === 'groups') await removeCommitteeGroup(selectedCommitteeId, id)
      setTabStatus({ message: 'Relation removed successfully.', error: '' })
      await loadTabData(selectedCommitteeId, activeTab)
    } catch (error) {
      setTabStatus({ message: '', error: `(${error.status ?? 'N/A'}) ${error.message}` })
    } finally {
      setTabLoading(false)
    }
  }

  const activeCollection = useMemo(() => {
    if (activeTab === 'jury') return juryMembers
    if (activeTab === 'advisors') return advisors
    return assignedGroups
  }, [activeTab, juryMembers, advisors, assignedGroups])

  const getRelationId = useCallback((item) => {
    if (typeof item === 'string') return item
    return (
      item?.userId ||
      item?.advisorUserId ||
      item?.groupId ||
      item?.id ||
      item?.committeeId ||
      'unknown'
    )
  }, [])

  const committeeMeta = useMemo(() => {
    if (pagination.total === null) return null
    const shownPage = pagination.page || filters.page
    return `Page ${shownPage} / Limit ${pagination.limit || filters.limit} / Total ${pagination.total}`
  }, [pagination, filters.page, filters.limit])

  return (
    <div className="space-y-5">
      {activeRole === 'ADMIN' && (
        <SectionCard title="Admin Suite" description="Register new coordinator accounts.">
          <CreateCoordinatorForm />
        </SectionCard>
      )}

      {/* Schedule Management */}
      <SectionCard
        title="Schedule Management"
        description="Create schedule and inspect active window."
      >
        <form onSubmit={onCreateSchedule} className="space-y-4">
          <div>
            <label htmlFor="phaseInput" className={labelClass}>
              Phase
            </label>
            <input
              id="phaseInput"
              className={inputClass}
              value={scheduleForm.phase}
              onChange={(event) =>
                setScheduleForm((prev) => ({ ...prev, phase: event.target.value }))
              }
              placeholder="e.g. COMMITTEE_ASSIGNMENT"
              required
            />
          </div>
          <div>
            <label htmlFor="startAtInput" className={labelClass}>
              Start Date
            </label>
            <input
              id="startAtInput"
              type="datetime-local"
              className={inputClass}
              value={scheduleForm.startAt}
              onChange={(event) =>
                setScheduleForm((prev) => ({ ...prev, startAt: event.target.value }))
              }
              required
            />
          </div>
          <div>
            <label htmlFor="endAtInput" className={labelClass}>
              End Date
            </label>
            <input
              id="endAtInput"
              type="datetime-local"
              className={inputClass}
              value={scheduleForm.endAt}
              onChange={(event) =>
                setScheduleForm((prev) => ({ ...prev, endAt: event.target.value }))
              }
              required
            />
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <button type="submit" disabled={scheduleLoading} className={btnPrimary}>
              {scheduleLoading ? 'Saving...' : 'Create Schedule'}
            </button>
            <button
              type="button"
              onClick={loadActiveSchedule}
              disabled={scheduleLoading}
              className={btnGhost}
            >
              {scheduleLoading ? 'Loading...' : 'Refresh Active Window'}
            </button>
          </div>
        </form>

        <StatusMessage status={scheduleStatus} />

        <div className="overflow-x-auto rounded-xl border border-[#1e293b] bg-[#080f1f] p-4 text-xs text-slate-300 font-mono mt-3">
          {activeSchedule ? (
            <pre>{JSON.stringify(activeSchedule, null, 2)}</pre>
          ) : (
            <p className="text-sm text-slate-500 py-4 text-center">
              No active schedule window found.
            </p>
          )}
        </div>
      </SectionCard>

      {/* Committee List & CRUD */}
      <SectionCard
        title="Committee List & CRUD"
        description="Filter by name, paginate and manage committee records."
      >
        <div className="flex flex-wrap gap-3 items-end mb-4">
          <div className="flex-1 min-w-[180px]">
            <label htmlFor="filterName" className={labelClass}>
              Name Filter
            </label>
            <input
              id="filterName"
              className={inputClass}
              value={filters.name}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, name: event.target.value, page: 1 }))
              }
              placeholder="Search committee by name"
            />
          </div>
          <div className="w-28">
            <label htmlFor="filterLimit" className={labelClass}>
              Page Size
            </label>
            <input
              id="filterLimit"
              type="number"
              min="1"
              max="50"
              className={inputClass}
              value={filters.limit}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  limit: Number(event.target.value) || 10,
                  page: 1,
                }))
              }
            />
          </div>
          <button
            type="button"
            onClick={loadCommittees}
            disabled={committeeLoading}
            className={btnPrimary}
          >
            {committeeLoading ? 'Loading...' : 'Apply'}
          </button>
        </div>

        <form onSubmit={onSubmitCommittee} className="space-y-4">
          <div>
            <label htmlFor="committeeName" className={labelClass}>
              Committee Name
            </label>
            <input
              id="committeeName"
              className={inputClass}
              value={committeeForm.name}
              onChange={(event) => setCommitteeForm({ name: event.target.value })}
              placeholder="e.g. AI Research Committee"
              required
            />
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <button type="submit" disabled={committeeLoading} className={btnPrimary}>
              {committeeLoading
                ? 'Saving...'
                : editingCommitteeId
                  ? 'Update Committee'
                  : 'Create Committee'}
            </button>
            {editingCommitteeId && (
              <button
                type="button"
                className={btnGhost}
                onClick={() => {
                  setEditingCommitteeId(null)
                  setCommitteeForm({ name: '' })
                }}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>

        <StatusMessage status={committeeStatus} />

        {committeeMeta && (
          <p className="text-xs text-slate-500 mt-3">{committeeMeta}</p>
        )}

        <div className="mt-3">
          {committeeLoading ? (
            <p className="text-sm text-slate-500 py-4 text-center">Loading committees...</p>
          ) : committees.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">
              No committees found for current filter.
            </p>
          ) : (
            committees.map((committee) => {
              const id = committee.id || committee.committeeId
              const name = committee.name || committee.committeeName || 'Unnamed committee'
              return (
                <div
                  key={id}
                  className="flex items-center justify-between py-3 border-b border-[#1e293b] hover:bg-white/5 px-3 rounded-lg"
                >
                  <button
                    type="button"
                    className="text-sm text-slate-200 hover:text-blue-400 text-left"
                    onClick={() => setSelectedCommitteeId(id)}
                  >
                    {name}
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={() => {
                        setEditingCommitteeId(id)
                        setCommitteeForm({ name })
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={btnDanger}
                      onClick={() => onDeleteCommittee(id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="flex gap-3 mt-4">
          <button
            type="button"
            disabled={committeeLoading || filters.page <= 1}
            className={btnGhost}
            onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
          >
            Previous
          </button>
          <button
            type="button"
            disabled={
              committeeLoading ||
              (pagination.total !== null && committees.length < filters.limit)
            }
            className={btnGhost}
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
          </button>
        </div>
      </SectionCard>

      {/* Committee Details */}
      <SectionCard
        title="Committee Details"
        description="Jury, advisors and groups management tabs."
      >
        <div className="flex flex-wrap gap-3 items-end mb-4">
          <div className="flex-1 min-w-[180px]">
            <label htmlFor="committeeSelect" className={labelClass}>
              Selected Committee
            </label>
            <input
              id="committeeSelect"
              className={inputClass}
              value={selectedCommitteeId}
              onChange={(event) => setSelectedCommitteeId(event.target.value)}
              placeholder="Committee ID"
            />
          </div>
          <button
            type="button"
            className={btnPrimary}
            onClick={() => loadCommitteeDetails(selectedCommitteeId)}
            disabled={detailLoading || !selectedCommitteeId}
          >
            {detailLoading ? 'Loading...' : 'Load Details'}
          </button>
        </div>

        <StatusMessage status={detailStatus} />

        <div className="overflow-x-auto rounded-xl border border-[#1e293b] bg-[#080f1f] p-4 text-xs text-slate-300 font-mono mt-3">
          {selectedCommittee ? (
            <pre>{JSON.stringify(selectedCommittee, null, 2)}</pre>
          ) : (
            <p className="text-sm text-slate-500 py-4 text-center">
              No committee selected yet.
            </p>
          )}
        </div>

        {/* Relation Tabs */}
        <div
          className="flex gap-1 rounded-xl border border-[#1e293b] bg-[#080f1f] p-1 mb-4 mt-5"
          role="tablist"
          aria-label="Committee relation tabs"
        >
          {TAB_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              className={[
                'flex-1 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors',
                activeTab === key
                  ? 'bg-blue-600/15 text-blue-400'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5',
              ].join(' ')}
            >
              {key === 'jury' ? 'Jury' : key === 'advisors' ? 'Advisors' : 'Groups'}
            </button>
          ))}
        </div>

        <form onSubmit={onAddRelation} className="space-y-4">
          {activeTab === 'jury' && (
            <div>
              <label htmlFor="juryInput" className={labelClass}>
                Jury User ID
              </label>
              <input
                id="juryInput"
                className={inputClass}
                value={juryInput}
                onChange={(event) => setJuryInput(event.target.value)}
                placeholder="user id"
              />
            </div>
          )}
          {activeTab === 'advisors' && (
            <div>
              <label htmlFor="advisorInput" className={labelClass}>
                Advisor User ID
              </label>
              <input
                id="advisorInput"
                className={inputClass}
                value={advisorInput}
                onChange={(event) => setAdvisorInput(event.target.value)}
                placeholder="advisor user id"
              />
            </div>
          )}
          {activeTab === 'groups' && (
            <div>
              <label htmlFor="groupInput" className={labelClass}>
                Group ID
              </label>
              <input
                id="groupInput"
                className={inputClass}
                value={groupInput}
                onChange={(event) => setGroupInput(event.target.value)}
                placeholder="group id"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-3 items-end">
            <button
              type="submit"
              disabled={tabLoading || !selectedCommitteeId}
              className={btnPrimary}
            >
              {tabLoading ? 'Processing...' : 'Add / Assign'}
            </button>
            <button
              type="button"
              className={btnGhost}
              onClick={() => loadTabData(selectedCommitteeId, activeTab)}
              disabled={tabLoading || !selectedCommitteeId}
            >
              {tabLoading ? 'Loading...' : 'Refresh Tab'}
            </button>
          </div>
        </form>

        <StatusMessage status={tabStatus} />

        <div className="mt-3">
          {tabLoading ? (
            <p className="text-sm text-slate-500 py-4 text-center">Loading tab data...</p>
          ) : activeCollection.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">
              No records available in this tab.
            </p>
          ) : (
            activeCollection.map((item) => {
              const id = getRelationId(item)
              return (
                <div
                  key={id}
                  className="flex items-center justify-between py-3 border-b border-[#1e293b] hover:bg-white/5 px-3 rounded-lg"
                >
                  <pre className="overflow-x-auto rounded-xl border border-[#1e293b] bg-[#080f1f] p-4 text-xs text-slate-300 font-mono flex-1 mr-4">
                    {JSON.stringify(item, null, 2)}
                  </pre>
                  <button
                    type="button"
                    className={btnDanger}
                    onClick={() => onRemoveRelation(id)}
                  >
                    Remove
                  </button>
                </div>
              )
            })
          )}
        </div>
      </SectionCard>
    </div>
  )
}

export default CoordinatorManagementPage
