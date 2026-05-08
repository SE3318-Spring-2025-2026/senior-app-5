import { useCallback, useEffect, useMemo, useState } from 'react'
import styles from './CoordinatorManagementPage.module.css'
import { createSchedule, getActiveSchedule } from '../utils/scheduleService'
import {
  addAdvisor,
  addJuryMember,
  assignCommitteeGroup,
  getCommittee,
  listAdvisors,
  listCommitteeGroups,
  listJuryMembers,
  removeAdvisor,
  removeCommitteeGroup,
  removeJuryMember,
} from '../utils/committeeService'

import { useAuth } from '../context/AuthContext'
import { CreateCoordinatorForm } from '../components/CreateCoordinatorForm'
import EntitySearchSelect from '../components/EntitySearchSelect'
import apiConfig from '../config/api'
import apiClient from '../utils/apiClient'
import { openNativeDatePicker } from '../utils/openPicker'

const emptyStatus = () => ({ message: '', error: '' })
const TAB_KEYS = ['jury', 'advisors', 'groups']

const toList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

const getListItems = (payload) => toList(payload)
const buildCommitteeSearchParams = (query) => ({ page: 1, limit: 10, name: query })

const PHASE_LABELS = {
  ADVISOR_SELECTION: 'Advisor Selection',
  COMMITTEE_ASSIGNMENT: 'Committee Assignment',
  SPRINT: 'Sprint',
}

function formatPhaseLabel(phase) {
  if (!phase) return '—'
  return PHASE_LABELS[phase] || String(phase).replace(/_/g, ' ')
}

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function committeeDisplayName(c) {
  if (!c) return '—'
  return c.name ?? c.committeeName ?? c.title ?? '—'
}

function committeeRefId(c) {
  if (!c) return null
  return c.id ?? c._id ?? c.committeeId ?? null
}

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

  // Assign student to group state
  const [assignStudentId, setAssignStudentId] = useState('')
  const [assignGroupId, setAssignGroupId] = useState('')
  const [assignStatus, setAssignStatus] = useState(emptyStatus())
  const [assignLoading, setAssignLoading] = useState(false)

  const loadActiveSchedule = useCallback(async (phase) => {
    if (!phase) {
      setActiveSchedule(null)
      return
    }
    setScheduleLoading(true)
    setScheduleStatus(emptyStatus())
    try {
      const data = await getActiveSchedule(phase)
      setActiveSchedule(data)
      setScheduleStatus({ message: 'Active schedule loaded successfully.', error: '' })
    } catch (error) {
      setScheduleStatus({ message: '', error: `(${error.status ?? 'N/A'}) ${error.message}` })
      setActiveSchedule(null)
    } finally {
      setScheduleLoading(false)
    }
  }, [])

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
    if (!selectedCommitteeId) return
    loadCommitteeDetails(selectedCommitteeId)
    loadTabData(selectedCommitteeId, activeTab)
  }, [selectedCommitteeId, activeTab, loadCommitteeDetails, loadTabData])

  // 🔥 1. PAYLOAD VE VALIDASYON DÜZELTMESİ (ISSUE #1 AŞAMASI)
  const onCreateSchedule = async (event) => {
    event.preventDefault()
    setScheduleStatus(emptyStatus())

    if (!scheduleForm.phase) {
      setScheduleStatus({ message: '', error: 'Phase is required.' })
      return
    }
    if (!scheduleForm.startAt || !scheduleForm.endAt) {
      setScheduleStatus({ message: '', error: 'Start and end date are required.' })
      return
    }

    const startDate = new Date(scheduleForm.startAt)
    const endDate = new Date(scheduleForm.endAt)

    // Backend validasyonu öncesi Client-side güvenlik (End date > Start Date)
    if (endDate <= startDate) {
      setScheduleStatus({ message: '', error: 'End date must be after start date.' })
      return
    }

    setScheduleLoading(true)
    try {
      // Backend'in tam olarak beklediği DTO yapısı
      const payload = {
        phase: scheduleForm.phase,
        startDatetime: startDate.toISOString(),
        endDatetime: endDate.toISOString()
      }

      await createSchedule(payload)
      setScheduleStatus({ message: 'Schedule created successfully.', error: '' })
      await loadActiveSchedule(scheduleForm.phase)
    } catch (error) {
      setScheduleStatus({ message: '', error: `(${error.status ?? 'N/A'}) ${error.message}` })
    } finally {
      setScheduleLoading(false)
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

  const onAssignStudentToGroup = async (event) => {
    event.preventDefault()
    if (!assignStudentId.trim()) {
      setAssignStatus({ message: '', error: 'Student is required.' })
      return
    }
    if (!assignGroupId.trim()) {
      setAssignStatus({ message: '', error: 'Group is required.' })
      return
    }
    setAssignStatus(emptyStatus())
    setAssignLoading(true)
    try {
      await apiClient.patch(apiConfig.endpoints.adminAssignStudentGroup(assignStudentId.trim()), {
        groupId: assignGroupId.trim(),
      })
      setAssignStatus({ message: `Student successfully assigned to group "${assignGroupId}".`, error: '' })
      setAssignStudentId('')
      setAssignGroupId('')
    } catch (error) {
      const status = error?.response?.status
      const msg = error?.response?.data?.message
      const normalized = Array.isArray(msg) ? msg.join(', ') : msg
      setAssignStatus({ message: '', error: `(${status ?? 'N/A'}) ${normalized || error.message}` })
    } finally {
      setAssignLoading(false)
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
          <form className={styles.form} noValidate onSubmit={onCreateSchedule}>
            <label htmlFor="phaseInput">
              Phase
              <select
                id="phaseInput"
                value={scheduleForm.phase}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, phase: event.target.value }))}
                required
              >
                <option value="" disabled>Select a phase...</option>
                <option value="ADVISOR_SELECTION">Advisor Selection</option>
                <option value="COMMITTEE_ASSIGNMENT">Committee Assignment</option>
                <option value="SPRINT">Sprint</option>
              </select>
            </label>
            <label htmlFor="startAtInput">
              Start Date
              <input
                id="startAtInput"
                type="datetime-local"
                value={scheduleForm.startAt}
                onClick={openNativeDatePicker}
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
                onClick={openNativeDatePicker}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, endAt: event.target.value }))}
                required
              />
            </label>
            
            {/* 🔥 UX İYİLEŞTİRMESİ: Kullanıcıya ISO 8601 uyarısı eklendi */}
            <p className={styles.meta} style={{ marginTop: '-5px', marginBottom: '10px' }}>
               * Dates are securely converted to UTC (ISO 8601) format before saving.
            </p>

            <div className={styles.inlineActions}>
              <button type="submit" disabled={scheduleLoading}>
                {scheduleLoading ? 'Saving...' : 'Create Schedule'}
              </button>
              <button type="button" onClick={() => loadActiveSchedule(scheduleForm.phase)} disabled={scheduleLoading}>
                {scheduleLoading ? 'Loading...' : 'Refresh Active Window'}
              </button>
            </div>
          </form>
          <StatusMessage status={scheduleStatus} />
          <div className={styles.infoPanel}>
            {activeSchedule ? (
              <div className={styles.summaryPanel}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Phase</span>
                  <span className={styles.summaryValue}>{formatPhaseLabel(activeSchedule.phase)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Window</span>
                  <span className={styles.summaryValue}>
                    {formatDateTime(activeSchedule.startDatetime)} → {formatDateTime(activeSchedule.endDatetime)}
                  </span>
                </div>
                {typeof activeSchedule.isOpen === 'boolean' ? (
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Status</span>
                    <span
                      className={`${styles.windowPill} ${activeSchedule.isOpen ? styles.windowOpen : styles.windowClosed}`}
                    >
                      {activeSchedule.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className={styles.empty}>No active schedule window found.</p>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Assign Student to Group" subtitle="Search for a student by email and assign them to a group.">
        <form className={styles.form} onSubmit={onAssignStudentToGroup}>
          <EntitySearchSelect
            label="Student"
            endpoint={apiConfig.endpoints.userSearch}
            buildParams={(q) => ({ field: 'email', value: q, limit: 10 })}
            getItems={(res) => (Array.isArray(res) ? res : res?.data ?? [])}
            returnField="_id"
            displayField="email"
            value={assignStudentId}
            onChange={setAssignStudentId}
            placeholder="Search student by email"
          />
          <EntitySearchSelect
            label="Group"
            endpoint={apiConfig.endpoints.groups}
            buildParams={(q) => ({ name: q, page: 1, limit: 20 })}
            getItems={(res) => res?.data ?? []}
            returnField="groupId"
            displayField="groupName"
            value={assignGroupId}
            onChange={setAssignGroupId}
            placeholder="Search group by name"
          />
          <div className={styles.inlineActions}>
            <button type="submit" disabled={assignLoading}>
              {assignLoading ? 'Assigning...' : 'Assign Student'}
            </button>
          </div>
        </form>
        <StatusMessage status={assignStatus} />
      </SectionCard>

      <SectionCard title="Committee Details" subtitle="Jury, advisors and groups management tabs.">
        <div className={styles.selectRow}>
          <div className={styles.searchControl}>
            <EntitySearchSelect
              label="Selected Committee"
              endpoint={apiConfig.endpoints.committees}
              searchField="name"
              returnField="id"
              displayField="name"
              value={selectedCommitteeId}
              onChange={setSelectedCommitteeId}
              onSelect={(committee) => setSelectedCommittee(committee)}
              placeholder="Search committee by name"
              buildParams={buildCommitteeSearchParams}
              getItems={getListItems}
            />
          </div>
          <button type="button" onClick={() => loadCommitteeDetails(selectedCommitteeId)} disabled={detailLoading || !selectedCommitteeId}>
            {detailLoading ? 'Loading...' : 'Load Details'}
          </button>
        </div>

        <StatusMessage status={detailStatus} />
        <div className={styles.infoPanel}>
          {selectedCommittee ? (
            <div className={styles.summaryPanel}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Committee</span>
                <span className={styles.summaryValue}>{committeeDisplayName(selectedCommittee)}</span>
              </div>
              {committeeRefId(selectedCommittee) ? (
                <p className={styles.meta} style={{ margin: 0 }}>
                  Reference: {committeeRefId(selectedCommittee)}
                </p>
              ) : null}
            </div>
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
            <EntitySearchSelect
              label="Jury User"
              endpoint={apiConfig.endpoints.userSearch}
              searchField="email"
              returnField="_id"
              displayField="email"
              value={juryInput}
              onChange={setJuryInput}
              placeholder="Search jury user by email"
            />
          ) : null}
          {activeTab === 'advisors' ? (
            <EntitySearchSelect
              label="Advisor User"
              endpoint={apiConfig.endpoints.userSearch}
              searchField="email"
              returnField="_id"
              displayField="email"
              value={advisorInput}
              onChange={setAdvisorInput}
              placeholder="Search advisor by email"
            />
          ) : null}
          {activeTab === 'groups' ? (
            <EntitySearchSelect
              label="Group"
              endpoint={apiConfig.endpoints.groups}
              buildParams={(q) => ({ name: q, page: 1, limit: 20 })}
              getItems={(res) => res.data}
              returnField="groupId"
              displayField="groupName"
              value={groupInput}
              onChange={setGroupInput}
              placeholder="Search group by name"
            />
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
              const label = item?.email ?? item?.advisorEmail ?? item?.groupName ?? id
              const sub = item?.assignedAt ? `Assigned ${new Date(item.assignedAt).toLocaleString()}` : null
              return (
                <article key={id} className={styles.listItem}>
                  <div>
                    <p style={{ fontWeight: 600 }}>{label}</p>
                    {sub && <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>{sub}</p>}
                  </div>
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