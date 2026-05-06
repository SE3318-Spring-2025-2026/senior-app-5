import { useState, useEffect, useCallback } from 'react'
import apiClient from '../utils/apiClient'
import apiConfig from '../config/api'
import styles from './GroupLifecyclePage.module.css'

const PHASE = 'ADVISOR_SELECTION'

const getApiError = (error) => {
  const message = error?.response?.data?.message
  return Array.isArray(message) ? message.join(', ') : message || error.message || 'Unexpected error.'
}

function formatDateRange(schedule) {
  if (!schedule) return null
  const fmt = (iso) =>
    iso
      ? new Date(iso).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '–'
  return `${fmt(schedule.startAt || schedule.startDatetime)} → ${fmt(schedule.endAt || schedule.endDatetime)}`
}

function isWindowOpen(schedule) {
  if (!schedule) return false
  const now = new Date()
  const start = new Date(schedule.startAt || schedule.startDatetime)
  const end = new Date(schedule.endAt || schedule.endDatetime)
  return now >= start && now <= end
}

function StatusMessage({ state }) {
  if (!state?.message && !state?.error) return null
  return (
    <div
      className={`${styles.statusBlock} ${state.error ? styles.error : styles.success}`}
      role="status"
      aria-live="polite"
    >
      {state.error || state.message}
    </div>
  )
}

function AdvisorSchedulePage() {
  const [activeSchedule, setActiveSchedule] = useState(null)
  const [fetchState, setFetchState] = useState({ loading: false, message: '', error: '' })
  const [form, setForm] = useState({ startAt: '', endAt: '' })
  const [createState, setCreateState] = useState({ loading: false, message: '', error: '' })

  const fetchActiveSchedule = useCallback(async () => {
    setFetchState({ loading: true, message: '', error: '' })
    try {
      const response = await apiClient.get(apiConfig.endpoints.schedulesActive, {
        params: { phase: PHASE },
      })
      setActiveSchedule(response.data || null)
      setFetchState({ loading: false, message: '', error: '' })
    } catch (error) {
      if (error?.response?.status === 404) {
        setActiveSchedule(null)
        setFetchState({ loading: false, message: '', error: '' })
      } else {
        setFetchState({ loading: false, message: '', error: getApiError(error) })
      }
    }
  }, [])

  useEffect(() => {
    fetchActiveSchedule()
  }, [fetchActiveSchedule])

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!form.startAt || !form.endAt) {
      setCreateState({ loading: false, message: '', error: 'Start and end date are required.' })
      return
    }
    if (new Date(form.startAt) >= new Date(form.endAt)) {
      setCreateState({ loading: false, message: '', error: 'End date must be after start date.' })
      return
    }

    setCreateState({ loading: true, message: '', error: '' })
    try {
      await apiClient.post(apiConfig.endpoints.schedules, {
        phase: PHASE,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
      })
      setCreateState({
        loading: false,
        message: 'Advisor selection schedule created successfully.',
        error: '',
      })
      setForm({ startAt: '', endAt: '' })
      await fetchActiveSchedule()
    } catch (error) {
      setCreateState({ loading: false, message: '', error: getApiError(error) })
    }
  }

  const open = isWindowOpen(activeSchedule)

  return (
    <div className={styles.pageContainer}>
      <header className={styles.hero}>
        <div>
          <p className={styles.badge}>Coordinator</p>
          <h1>Advisor Selection Schedule</h1>
          <p className={styles.lead}>
            Configure the window during which student team leaders can submit advisee requests.
            Teams can only send requests while this window is open.
          </p>
        </div>
      </header>

      <div style={{ display: 'grid', gap: '20px', maxWidth: '760px' }}>
        <section
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '18px' }}>Current Window</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: open ? 'rgba(34,197,94,0.2)' : 'rgba(100,116,139,0.2)',
                  color: open ? '#4ade80' : '#94a3b8',
                }}
              >
                {fetchState.loading ? 'Loading…' : open ? 'Open' : 'Closed'}
              </span>
              <button
                type="button"
                onClick={fetchActiveSchedule}
                disabled={fetchState.loading}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #475569',
                  background: 'transparent',
                  color: '#94a3b8',
                  fontSize: '13px',
                  cursor: fetchState.loading ? 'not-allowed' : 'pointer',
                }}
              >
                Refresh
              </button>
            </div>
          </div>

          <StatusMessage state={fetchState} />

          {activeSchedule ? (
            <div className={styles.resultBox}>
              <p style={{ margin: 0, color: '#f8fafc', fontWeight: 600 }}>
                {formatDateRange(activeSchedule)}
              </p>
              <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '13px' }}>
                Phase: {activeSchedule.phase || PHASE}
              </p>
            </div>
          ) : (
            !fetchState.loading && (
              <p className={styles.emptyState}>No active advisor selection schedule found.</p>
            )
          )}
        </section>

        <section
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '24px',
          }}
        >
          <h2 style={{ margin: '0 0 16px', color: '#f8fafc', fontSize: '18px' }}>
            Create New Window
          </h2>
          <form className={styles.form} onSubmit={handleCreate}>
            <label>
              Start Date & Time
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => setForm((prev) => ({ ...prev, startAt: e.target.value }))}
                required
              />
            </label>
            <label>
              End Date & Time
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => setForm((prev) => ({ ...prev, endAt: e.target.value }))}
                required
              />
            </label>
            <button type="submit" disabled={createState.loading}>
              {createState.loading ? 'Creating…' : 'Create Schedule'}
            </button>
          </form>
          <StatusMessage state={createState} />
        </section>
      </div>
    </div>
  )
}

export default AdvisorSchedulePage
