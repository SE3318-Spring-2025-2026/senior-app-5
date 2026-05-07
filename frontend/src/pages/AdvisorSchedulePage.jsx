import { useState, useEffect, useCallback } from 'react'
import apiClient from '../utils/apiClient'
import apiConfig from '../config/api'
import { Badge, PageHeader } from '../components/ui'

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
    <div>
      <PageHeader
        title="Advisor Selection Schedule"
        subtitle="Configure when team leaders can submit advisee requests."
      />

      <div className="grid gap-5 max-w-[760px]">
        {/* Current Window */}
        <section className="bg-[#111827] rounded-2xl border border-[#1e293b] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-bold text-slate-200">Current Window</h2>
            <div className="flex items-center gap-2.5">
              <Badge color={open ? 'green' : 'slate'}>
                {fetchState.loading ? 'Loading…' : open ? 'Open' : 'Closed'}
              </Badge>
              <button
                type="button"
                onClick={fetchActiveSchedule}
                disabled={fetchState.loading}
                className="rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm font-bold text-slate-300 hover:border-slate-600 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Refresh
              </button>
            </div>
          </div>

          {fetchState.error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 mt-3">
              {fetchState.error}
            </p>
          )}

          {activeSchedule ? (
            <div className="rounded-xl border border-[#1e293b] bg-[#080f1f] p-4">
              <p className="text-sm font-semibold text-slate-200">{formatDateRange(activeSchedule)}</p>
              <p className="text-xs text-slate-500 mt-1">Phase: {activeSchedule.phase || PHASE}</p>
            </div>
          ) : (
            !fetchState.loading && (
              <p className="text-sm text-slate-500">No active advisor selection schedule found.</p>
            )
          )}
        </section>

        {/* Create New Window */}
        <section className="bg-[#111827] rounded-2xl border border-[#1e293b] p-5">
          <h2 className="text-sm font-bold text-slate-200 mb-4">Create New Window</h2>

          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Start Date &amp; Time
              </label>
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => setForm((prev) => ({ ...prev, startAt: e.target.value }))}
                required
                className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                End Date &amp; Time
              </label>
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => setForm((prev) => ({ ...prev, endAt: e.target.value }))}
                required
                className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={createState.loading}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {createState.loading ? 'Creating…' : 'Create Schedule'}
              </button>
            </div>
          </form>

          {createState.message && (
            <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400 mt-3">
              {createState.message}
            </p>
          )}
          {createState.error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 mt-3">
              {createState.error}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

export default AdvisorSchedulePage
