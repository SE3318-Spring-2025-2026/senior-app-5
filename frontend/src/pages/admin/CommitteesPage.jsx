import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../utils/apiClient'
import apiConfig from '../../config/api'

const PHASE = 'COMMITTEE_ASSIGNMENT'

const getApiError = (error) => {
  const message = error?.response?.data?.message
  return Array.isArray(message) ? message.join(', ') : message || error.message || 'Unexpected error.'
}

function WindowBadge({ open }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
        open ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {open ? 'OPEN' : 'CLOSED'}
    </span>
  )
}

export default function CommitteesPage() {
  const navigate = useNavigate()

  const [schedule, setSchedule] = useState(null)
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')
  const [scheduleStatus, setScheduleStatus] = useState({ message: '', error: '', loading: false })

  const [committees, setCommittees] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')

  const [newName, setNewName] = useState('')
  const [createStatus, setCreateStatus] = useState({ message: '', error: '', loading: false })

  const fetchSchedule = useCallback(async () => {
    setScheduleLoading(true)
    try {
      const res = await apiClient.get(`${apiConfig.endpoints.schedulesActive}?phase=${PHASE}`)
      setSchedule(res.data)
    } catch {
      setSchedule(null)
    } finally {
      setScheduleLoading(false)
    }
  }, [])

  const fetchCommittees = useCallback(async (p = 1) => {
    setListLoading(true)
    setListError('')
    try {
      const res = await apiClient.get(`${apiConfig.endpoints.committees}?page=${p}&limit=20`)
      const body = res.data
      setCommittees(body.data || body.items || [])
      setTotalPages(body.meta?.totalPages || 1)
    } catch (err) {
      setListError(getApiError(err))
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchedule()
    fetchCommittees(1)
  }, [fetchSchedule, fetchCommittees])

  const handleCreateSchedule = async (e) => {
    e.preventDefault()
    setScheduleStatus({ loading: true, message: '', error: '' })
    try {
      await apiClient.post(apiConfig.endpoints.schedules, {
        phase: PHASE,
        startDatetime: newStart,
        endDatetime: newEnd,
      })
      setScheduleStatus({ loading: false, message: 'Schedule window created.', error: '' })
      setNewStart('')
      setNewEnd('')
      await fetchSchedule()
    } catch (err) {
      setScheduleStatus({ loading: false, message: '', error: getApiError(err) })
    }
  }

  const handleCreateCommittee = async (e) => {
    e.preventDefault()
    setCreateStatus({ loading: true, message: '', error: '' })
    try {
      await apiClient.post(apiConfig.endpoints.committees, { name: newName })
      setCreateStatus({ loading: false, message: `Committee "${newName}" created.`, error: '' })
      setNewName('')
      await fetchCommittees(page)
    } catch (err) {
      setCreateStatus({ loading: false, message: '', error: getApiError(err) })
    }
  }

  const isWindowOpen =
    schedule &&
    new Date() >= new Date(schedule.startDatetime) &&
    new Date() <= new Date(schedule.endDatetime)

  const goTo = (p) => {
    setPage(p)
    fetchCommittees(p)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 p-1">

      {/* Schedule Window Card */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#111827] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
              Assignment Window
            </h2>
            {!scheduleLoading && <WindowBadge open={isWindowOpen} />}
          </div>
          <button
            onClick={fetchSchedule}
            disabled={scheduleLoading}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
          >
            ↺ Refresh
          </button>
        </div>

        {schedule && !scheduleLoading && (
          <p className="text-xs text-slate-500 mb-4">
            {new Date(schedule.startDatetime).toLocaleString()} &rarr;{' '}
            {new Date(schedule.endDatetime).toLocaleString()}
          </p>
        )}

        <form onSubmit={handleCreateSchedule} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Start</label>
            <input
              type="datetime-local"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              required
              className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">End</label>
            <input
              type="datetime-local"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              required
              className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60 disabled:opacity-50"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={scheduleStatus.loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {scheduleStatus.loading ? 'Saving…' : 'Set Window'}
            </button>
          </div>
        </form>

        {scheduleStatus.message && (
          <p className="mt-3 text-xs text-emerald-400">{scheduleStatus.message}</p>
        )}
        {scheduleStatus.error && (
          <p className="mt-3 text-xs text-red-400">{scheduleStatus.error}</p>
        )}
      </div>

      {/* Committees Card */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#111827] p-5">
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wide mb-4">
          Committees
        </h2>

        {/* Create form */}
        <form onSubmit={handleCreateCommittee} className="flex gap-2 mb-5">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Committee name…"
            required
            className="flex-1 rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600/60"
          />
          <button
            type="submit"
            disabled={createStatus.loading}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {createStatus.loading ? 'Creating…' : '+ New Committee'}
          </button>
        </form>

        {createStatus.message && (
          <p className="mb-3 text-xs text-emerald-400">{createStatus.message}</p>
        )}
        {createStatus.error && (
          <p className="mb-3 text-xs text-red-400">{createStatus.error}</p>
        )}

        {/* List */}
        {listLoading ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading…</div>
        ) : listError ? (
          <p className="text-sm text-red-400">{listError}</p>
        ) : committees.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No committees yet. Create one above.
          </div>
        ) : (
          <>
            <div className="divide-y divide-[#1e293b]">
              {committees.map((c) => {
                const id = c.id || c._id
                return (
                  <button
                    key={id}
                    onClick={() => navigate(`/admin/committees/${id}`)}
                    className="flex w-full items-center justify-between py-3.5 text-left transition-colors hover:bg-white/[0.02] px-3 -mx-3 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-200">{c.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {c.advisorCount ?? 0} advisors &middot; {c.groupCount ?? 0} groups
                        {c.createdAt
                          ? ` · Created ${new Date(c.createdAt).toLocaleDateString()}`
                          : ''}
                      </p>
                    </div>
                    <span className="ml-3 text-slate-600">›</span>
                  </button>
                )
              })}
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
                <span className="text-xs text-slate-500">
                  {page} / {totalPages}
                </span>
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
      </div>
    </div>
  )
}
