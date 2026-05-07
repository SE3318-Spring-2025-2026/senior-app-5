import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '../../utils/apiClient'
import apiConfig from '../../config/api'
import { PageHeader, Badge } from '../../components/ui'

const getApiError = (error) => {
  const message = error?.response?.data?.message
  return Array.isArray(message) ? message.join(', ') : message || error.message || 'Unexpected error.'
}

function StatusBadge({ status }) {
  const upper = String(status || '').toUpperCase()
  const colorMap = { ASSIGNED: 'green', UNASSIGNED: 'yellow', DISBANDED: 'red', ACTIVE: 'blue' }
  const color = colorMap[upper] || 'slate'
  return <Badge color={color}>{upper || 'Unknown'}</Badge>
}

function UserRow({ user, label }) {
  if (!user) {
    return (
      <div className="flex items-center gap-3 py-3">
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
          <p className="text-sm text-slate-500 italic">Not assigned</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400 shrink-0">
        {(user.name || user.email || '?')[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-slate-200 truncate">{user.name || '—'}</p>
        <p className="text-xs text-slate-500 truncate">{user.email}</p>
      </div>
    </div>
  )
}

export default function GroupDetailPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()

  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!groupId) return
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await apiClient.get(apiConfig.endpoints.groupById(groupId))
        setGroup(res.data)
      } catch (err) {
        setError(getApiError(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [groupId])

  return (
    <div className="max-w-3xl mx-auto space-y-5 p-1">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/groups')}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          ← Back to Groups
        </button>
      </div>

      {loading && (
        <div className="py-16 text-center text-sm text-slate-500">Loading group…</div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {group && (
        <>
          <div className="rounded-2xl border border-[#1e293b] bg-[#111827] p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <PageHeader title={group.groupName} />
              </div>
              <div className="flex gap-2 shrink-0 mt-1">
                <StatusBadge status={group.status} />
                <StatusBadge status={group.assignmentStatus} />
              </div>
            </div>

            <div className="divide-y divide-[#1e293b]">
              <UserRow user={group.leader} label="Team Leader" />
              <UserRow user={group.advisor} label="Advisor" />
            </div>
          </div>

          <div className="rounded-2xl border border-[#1e293b] bg-[#111827] p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">
              Members ({group.members?.length ?? 0})
            </p>

            {!group.members || group.members.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-4 text-center">No members assigned yet.</p>
            ) : (
              <div className="divide-y divide-[#1e293b]">
                {group.members.map((m) => {
                  const id = m._id || m.id || m.email
                  const initial = (m.name || m.email || '?')[0].toUpperCase()
                  const isLeader = group.leader && (m._id === group.leader._id || m.email === group.leader.email)
                  return (
                    <div key={id} className="flex items-center gap-3 py-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300 shrink-0">
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">
                          {m.name || '—'}
                          {isLeader && (
                            <span className="ml-2 text-[10px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
                              Leader
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{m.email}</p>
                      </div>
                      <span className="text-[10px] text-slate-600 uppercase">{m.role}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
