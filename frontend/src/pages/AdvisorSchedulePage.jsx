import { useState, useEffect, useCallback } from 'react'
import { CalendarClock, RefreshCw } from 'lucide-react'
import apiClient from '../utils/apiClient'
import apiConfig from '../config/api'
import { Badge, PageHeader } from '../components/ui'
import { openNativeDatePicker } from '../utils/openPicker'

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

function SectionLabel({ icon: Icon, children, action }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={13} className="text-zinc-600" />}
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {children}
        </span>
      </div>
      {action}
    </div>
  )
}

function FieldLabel({ children }) {
  return (
    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
      {children}
    </label>
  )
}

const inputCls =
  'w-full rounded-md border border-[#26262b] bg-[#0a0a0b] px-3.5 py-2.5 text-[13px] text-zinc-200 transition-colors focus:border-[#3a3a40] focus:outline-none focus:ring-1 focus:ring-[#3a3a40] disabled:opacity-50 disabled:cursor-not-allowed'

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
        startDatetime: new Date(form.startAt).toISOString(),
        endDatetime: new Date(form.endAt).toISOString(),
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
    <div>
      <PageHeader
        eyebrow="Coordinator"
        title="Advisor Selection Schedule"
        subtitle="Configure when team leaders can submit advisee requests."
      />

      <div className="grid gap-4 max-w-[760px]">
        {/* Current Window */}
        <section className="rounded-2xl border border-[#1f1f23] bg-[#131316] p-5">
          <SectionLabel
            icon={CalendarClock}
            action={
              <div className="flex items-center gap-2">
                <Badge color={open ? 'green' : 'slate'}>
                  {fetchState.loading ? 'Loading…' : open ? 'Open' : 'Closed'}
                </Badge>
                <button
                  type="button"
                  onClick={fetchActiveSchedule}
                  disabled={fetchState.loading}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#26262b] bg-[#18181c] px-3 py-1.5 text-[12px] font-medium text-zinc-300 transition-colors hover:border-[#3a3a40] hover:bg-[#1f1f23] hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw size={11} className={fetchState.loading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            }
          >
            Current window
          </SectionLabel>

          {fetchState.error && (
            <p className="mt-3 rounded-md border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-[13px] text-rose-300">
              {fetchState.error}
            </p>
          )}

          {activeSchedule ? (
            <div className="rounded-xl border border-[#1f1f23] bg-[#0e0e10] p-4">
              <p className="text-[13px] font-medium text-zinc-200">{formatDateRange(activeSchedule)}</p>
              <p className="mt-1 text-[11px] text-zinc-600">
                Phase: <span className="text-zinc-500">{activeSchedule.phase || PHASE}</span>
              </p>
            </div>
          ) : (
            !fetchState.loading && (
              <p className="text-[13px] text-zinc-600">No active advisor selection schedule found.</p>
            )
          )}
        </section>

        {/* Create New Window */}
        <section className="rounded-2xl border border-[#1f1f23] bg-[#131316] p-5">
          <SectionLabel icon={CalendarClock}>Create new window</SectionLabel>

          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div>
              <FieldLabel>Start date &amp; time</FieldLabel>
              <input
                type="datetime-local"
                value={form.startAt}
                onClick={openNativeDatePicker}
                onChange={(e) => setForm((prev) => ({ ...prev, startAt: e.target.value }))}
                required
                className={inputCls}
              />
            </div>

            <div>
              <FieldLabel>End date &amp; time</FieldLabel>
              <input
                type="datetime-local"
                value={form.endAt}
                onClick={openNativeDatePicker}
                onChange={(e) => setForm((prev) => ({ ...prev, endAt: e.target.value }))}
                required
                className={inputCls}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={createState.loading}
                className="rounded-md bg-zinc-100 px-4 py-2.5 text-[13px] font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#26262b] disabled:text-zinc-600"
              >
                {createState.loading ? 'Creating…' : 'Create schedule'}
              </button>
            </div>
          </form>

          {createState.message && (
            <p className="mt-3 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2.5 text-[13px] text-emerald-300">
              {createState.message}
            </p>
          )}
          {createState.error && (
            <p className="mt-3 rounded-md border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-[13px] text-rose-300">
              {createState.error}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

export default AdvisorSchedulePage
