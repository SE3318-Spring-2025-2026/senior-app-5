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
    const filtered = logs.filter(
      (log) =>
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredLogs(filtered)
  }, [logs, searchTerm])

  const fetchActivityLogs = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get(apiConfig.endpoints.activityLogs)
      setLogs(response.data)
      setFilteredLogs(response.data)
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
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Action Type</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, index) => (
                <tr key={index} className="border-t border-[#1e293b] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-slate-300 text-sm">{formatTimestamp(log.timestamp)}</td>
                  <td className="px-4 py-3 text-slate-300 text-sm">{log.user}</td>
                  <td className="px-4 py-3 text-slate-300 text-sm">{log.action}</td>
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
