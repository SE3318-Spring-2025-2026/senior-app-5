import { useCallback, useEffect, useMemo, useState } from 'react'
import styles from './CoordinatorManagementPage.module.css'
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
  const typeClass = status.error ? styles.error : styles.success
  return (
    <div className={`${styles.statusBlock} ${typeClass}`} role="status" aria-live="polite">
      {status.error || status.message}
    </div>
  )
}

function SectionCard({ title, subtitle, children }) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {children}
    </section>
  )
}

function CoordinatorManagementPage() {
  const { user } = useAuth()

  // 🛡️ GARANTİLİ RÜTBE BULUCU (Context veya Token üzerinden)
  const activeRole = useMemo(() => {
    if (user?.role) return String(user.role).toUpperCase();
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      return payload.role ? String(payload.role).toUpperCase() : null;
    } catch (error) {
      console.error("Token okunamadı:", error);
      return null;
    }
  }, [user]);

  const [scheduleForm, setScheduleForm] = useState({
    phase: '',
    startAt: '',
    endAt: '',
  })
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
      if (tabKey === 'jury') {
        setJuryMembers(toList(await listJuryMembers(committeeId)))
      }
      if (tabKey === 'advisors') {
        setAdvisors(toList(await listAdvisors(committeeId)))
      }
      if (tabKey === 'groups') {
        setAssignedGroups(toList(await listCommitteeGroups(committeeId)))
      }
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
    return item?.userId || item?.advisorUserId || item?.groupId || item?.id || item?.committeeId || 'unknown'
  }, [])

  const committeeMeta = useMemo(() => {
    if (pagination.total === null) return null
    const shownPage = pagination.page || filters.page
    return `Page ${shownPage} / Limit ${pagination.limit || filters.limit} / Total ${pagination.total}`
  }, [pagination, filters.page, filters.limit])

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <p className={styles.badge}>Coordinator Management Suite</p>
        <h1>Schedules, Committees, Members and Group Assignments</h1>
      </header>

      <div className={styles.grid}>
        
        {/* YENİ NESİL ÇELİK KAPI - Rütbe ne olursa olsun kesin bulur */}
        {activeRole === 'ADMIN' && (
          <SectionCard title="Admin Suite" subtitle="Register new coordinator accounts.">
            <CreateCoordinatorForm />
          </SectionCard>
        )}

        <SectionCard title="Schedule Management" subtitle="Create schedule and inspect active window.">
          <form className={styles.form} onSubmit={onCreateSchedule}>
            <label htmlFor="phaseInput">
              Phase
              <input
                id="phaseInput"
                value={scheduleForm.phase}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, phase: event.target.value }))}
                placeholder="e.g. COMMITTEE_ASSIGNMENT"
                required
              />
            </label>
            <label htmlFor="startAtInput">
              Start Date
              <input
                id="startAtInput"
                type="datetime-local"
                value={scheduleForm.startAt}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, startAt: event.target.value }))}
                required
              />
            </label>
            <label htmlFor="endAtInput">
              End Date
              <input
                id="endAtInput"
                type="datetime-local"
                value={scheduleForm.endAt}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, endAt: event.target.value }))}
                required
              />
            </label>
            <div className={styles.inlineActions}>
              <button type="submit" disabled={scheduleLoading}>
                {scheduleLoading ? 'Saving...' : 'Create Schedule'}
              </button>
              <button type="button" onClick={loadActiveSchedule} disabled={scheduleLoading}>
                {scheduleLoading ? 'Loading...' : 'Refresh Active Window'}
              </button>
            </div>
          </form>
          <StatusMessage status={scheduleStatus} />
          <div className={styles.infoPanel}>
            {activeSchedule ? (
              <pre>{JSON.stringify(activeSchedule, null, 2)}</pre>
            ) : (
              <p className={styles.empty}>No active schedule window found.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Committee List & CRUD" subtitle="Filter by name, paginate and manage committee records.">
          <div className={styles.filterRow}>
            <label htmlFor="filterName">
              Name Filter
              <input
                id="filterName"
                value={filters.name}
                onChange={(event) => setFilters((prev) => ({ ...prev, name: event.target.value, page: 1 }))}
                placeholder="Search committee by name"
              />
            </label>
            <label htmlFor="filterLimit">
              Page Size
              <input
                id="filterLimit"
                type="number"
                min="1"
                max="50"
                value={filters.limit}
                onChange={(event) => setFilters((prev) => ({ ...prev, limit: Number(event.target.value) || 10, page: 1 }))}
              />
            </label>
            <button type="button" onClick={loadCommittees} disabled={committeeLoading}>
              {committeeLoading ? 'Loading...' : 'Apply'}
            </button>
          </div>

          <form className={styles.form} onSubmit={onSubmitCommittee}>
            <label htmlFor="committeeName">
              Committee Name
              <input
                id="committeeName"
                value={committeeForm.name}
                onChange={(event) => setCommitteeForm({ name: event.target.value })}
                placeholder="e.g. AI Research Committee"
                required
              />
            </label>
            <div className={styles.inlineActions}>
              <button type="submit" disabled={committeeLoading}>
                {committeeLoading ? 'Saving...' : editingCommitteeId ? 'Update Committee' : 'Create Committee'}
              </button>
              {editingCommitteeId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCommitteeId(null)
                    setCommitteeForm({ name: '' })
                  }}
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>

          <StatusMessage status={committeeStatus} />

          {committeeMeta ? <p className={styles.meta}>{committeeMeta}</p> : null}
          <div className={styles.list}>
            {committeeLoading ? (
              <p className={styles.empty}>Loading committees...</p>
            ) : committees.length === 0 ? (
              <p className={styles.empty}>No committees found for current filter.</p>
            ) : (
              committees.map((committee) => {
                const id = committee.id || committee.committeeId
                const name = committee.name || committee.committeeName || 'Unnamed committee'
                return (
                  <article key={id} className={styles.listItem}>
                    <button
                      type="button"
                      className={styles.linkButton}
                      onClick={() => setSelectedCommitteeId(id)}
                    >
                      {name}
                    </button>
                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCommitteeId(id)
                          setCommitteeForm({ name })
                        }}
                      >
                        Edit
                      </button>
                      <button type="button" onClick={() => onDeleteCommittee(id)}>
                        Delete
                      </button>
                    </div>
                  </article>
                )
              })
            )}
          </div>

          <div className={styles.inlineActions}>
            <button
              type="button"
              disabled={committeeLoading || filters.page <= 1}
              onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={committeeLoading || (pagination.total !== null && committees.length < filters.limit)}
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </button>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Committee Details" subtitle="Jury, advisors and groups management tabs.">
        <div className={styles.selectRow}>
          <label htmlFor="committeeSelect">
            Selected Committee
            <input
              id="committeeSelect"
              value={selectedCommitteeId}
              onChange={(event) => setSelectedCommitteeId(event.target.value)}
              placeholder="Committee ID"
            />
          </label>
          <button type="button" onClick={() => loadCommitteeDetails(selectedCommitteeId)} disabled={detailLoading || !selectedCommitteeId}>
            {detailLoading ? 'Loading...' : 'Load Details'}
          </button>
        </div>

        <StatusMessage status={detailStatus} />
        <div className={styles.infoPanel}>
          {selectedCommittee ? (
            <pre>{JSON.stringify(selectedCommittee, null, 2)}</pre>
          ) : (
            <p className={styles.empty}>No committee selected yet.</p>
          )}
        </div>

        <div className={styles.tabs} role="tablist" aria-label="Committee relation tabs">
          {TAB_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeTab === key}
              className={activeTab === key ? styles.activeTab : styles.tab}
              onClick={() => setActiveTab(key)}
            >
              {key === 'jury' ? 'Jury' : key === 'advisors' ? 'Advisors' : 'Groups'}
            </button>
          ))}
        </div>

        <form className={styles.form} onSubmit={onAddRelation}>
          {activeTab === 'jury' ? (
            <label htmlFor="juryInput">
              Jury User ID
              <input id="juryInput" value={juryInput} onChange={(event) => setJuryInput(event.target.value)} placeholder="user id" />
            </label>
          ) : null}
          {activeTab === 'advisors' ? (
            <label htmlFor="advisorInput">
              Advisor User ID
              <input id="advisorInput" value={advisorInput} onChange={(event) => setAdvisorInput(event.target.value)} placeholder="advisor user id" />
            </label>
          ) : null}
          {activeTab === 'groups' ? (
            <label htmlFor="groupInput">
              Group ID
              <input id="groupInput" value={groupInput} onChange={(event) => setGroupInput(event.target.value)} placeholder="group id" />
            </label>
          ) : null}

          <div className={styles.inlineActions}>
            <button type="submit" disabled={tabLoading || !selectedCommitteeId}>
              {tabLoading ? 'Processing...' : 'Add / Assign'}
            </button>
            <button type="button" onClick={() => loadTabData(selectedCommitteeId, activeTab)} disabled={tabLoading || !selectedCommitteeId}>
              {tabLoading ? 'Loading...' : 'Refresh Tab'}
            </button>
          </div>
        </form>

        <StatusMessage status={tabStatus} />

        <div className={styles.list}>
          {tabLoading ? (
            <p className={styles.empty}>Loading tab data...</p>
          ) : activeCollection.length === 0 ? (
            <p className={styles.empty}>No records available in this tab.</p>
          ) : (
            activeCollection.map((item) => {
              const id = getRelationId(item)
              return (
                <article key={id} className={styles.listItem}>
                  <pre>{JSON.stringify(item, null, 2)}</pre>
                  <button type="button" onClick={() => onRemoveRelation(id)}>
                    Remove
                  </button>
                </article>
              )
            })
          )}
        </div>
      </SectionCard>
    </div>
  )
}

export default CoordinatorManagementPage