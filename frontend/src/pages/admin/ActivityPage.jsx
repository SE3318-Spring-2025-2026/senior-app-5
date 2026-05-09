// frontend/src/pages/admin/ActivityPage.jsx
import { useState, useEffect } from 'react'
import apiClient from '../../utils/apiClient'
import apiConfig from '../../config/api'
import { PageHeader } from '../../components/ui'

function ActivityPage() {
  const [logs, setLogs] = useState([])
  const [filteredLogs, setFilteredLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchActivityLogs()
  }, [])

  useEffect(() => {
    const normalizedSearch = searchTerm.toLowerCase()
    const filtered = logs.filter((log) => {
      const userText = String(log.user ?? '').toLowerCase()
      const subText = String(log.userSubtext ?? '').toLowerCase()
      const actionText = String(log.action ?? '').toLowerCase()
      const typeText = String(log.eventType ?? '').toLowerCase()
      return (
        userText.includes(normalizedSearch) ||
        subText.includes(normalizedSearch) ||
        actionText.includes(normalizedSearch) ||
        typeText.includes(normalizedSearch)
      )
    })
    setFilteredLogs(filtered)
  }, [logs, searchTerm])

  const actorDisplay = (log) => {
    const name = log.actorName?.trim?.()
    const email = log.actorEmail?.trim?.()
    if (name) return name
    if (email) return email
    if (log.user && log.user !== log.actorUserId) return log.user
    return log.actorUserId ?? 'System'
  }

  const mapLog = (log) => ({
    id: log.id ?? log._id ?? `${log.timestamp ?? ''}-${log.eventType ?? ''}`,
    timestamp: log.timestamp,
    user: actorDisplay(log),
    userSubtext:
      log.actorName && log.actorEmail
        ? log.actorEmail
        : log.actorUserId && (log.actorName || log.actorEmail)
          ? log.actorUserId
          : null,
    action: log.action ?? log.summary ?? log.eventType ?? 'Unknown action',
    eventType: log.eventType ?? null,
  })

  const fetchActivityLogs = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get(apiConfig.endpoints.activityLogs)
      const payload = response?.data
      const rawLogs = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : []
      const normalizedLogs = rawLogs.map(mapLog)
      setLogs(normalizedLogs)
      setFilteredLogs(normalizedLogs)
    } catch (err) {
      setError('Failed to fetch activity logs')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-1">
        <p className="py-12 text-center text-sm text-slate-500">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-1">
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 mt-3">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 p-1">
      <PageHeader title="Activity Logs" />

      <div className="mb-4">
        <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
          Search
        </label>
        <input
          type="text"
          placeholder="Search by user or action…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60 disabled:opacity-50"
        />
      </div>

      {filteredLogs.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">No activity logs found.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#1e293b]">
          <table className="w-full">
            <thead className="bg-[#080f1f]">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Timestamp</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">User</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Event</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Summary</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-t border-[#1e293b] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-slate-300 text-sm align-top">{formatTimestamp(log.timestamp)}</td>
                  <td className="px-4 py-3 text-slate-300 text-sm align-top">
                    <div className="font-medium text-slate-200">{log.user}</div>
                    {log.userSubtext ? (
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono truncate max-w-[220px]" title={log.userSubtext}>
                        {log.userSubtext}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs font-mono align-top">{log.eventType ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-300 text-sm align-top">{log.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ActivityPage
