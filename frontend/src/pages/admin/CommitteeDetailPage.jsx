import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '../../utils/apiClient'
import apiConfig from '../../config/api'
import EntitySearchSelect from '../../components/EntitySearchSelect'

const getApiError = (error) => {
  const message = error?.response?.data?.message
  return Array.isArray(message) ? message.join(', ') : message || error.message || 'Unexpected error.'
}

const TABS = ['Jury Members', 'Advisors', 'Groups', 'Grading Scope']

// ─── Small reusable pieces ────────────────────────────────────────────────────

function Badge({ label, variant = 'default' }) {
  const map = {
    default: 'bg-[#1e293b] text-slate-400',
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
    green: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
  }
  return (
    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${map[variant]}`}>
      {label}
    </span>
  )
}

function Pagination({ page, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between border-t border-[#1e293b] pt-4 mt-4">
      <button
        onClick={onPrev}
        disabled={page === 1}
        className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-colors"
      >
        ← Prev
      </button>
      <span className="text-xs text-slate-500">{page} / {totalPages}</span>
      <button
        onClick={onNext}
        disabled={page === totalPages}
        className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-colors"
      >
        Next →
      </button>
    </div>
  )
}

function RemoveButton({ onClick, label = 'Remove' }) {
  return (
    <button
      onClick={onClick}
      className="text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-2.5 py-1 rounded-lg transition-colors"
    >
      {label}
    </button>
  )
}

function StatusLine({ message, error }) {
  if (message) return <p className="text-xs text-emerald-400">{message}</p>
  if (error) return <p className="text-xs text-red-400">{error}</p>
  return null
}

// ─── Jury Members Tab ─────────────────────────────────────────────────────────

function JuryTab({ committeeId }) {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')
  const [addStatus, setAddStatus] = useState({ message: '', error: '', loading: false })

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    setError('')
    try {
      const res = await apiClient.get(
        `${apiConfig.endpoints.committeeJuryMembers(committeeId)}?page=${p}&limit=10`
      )
      const body = res.data
      setItems(body.data || body.items || [])
      setTotalPages(body.meta?.totalPages || 1)
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setLoading(false)
    }
  }, [committeeId])

  useEffect(() => { load(1) }, [load])

  const handleAdd = async (e) => {
    e.preventDefault()
    setAddStatus({ loading: true, message: '', error: '' })
    try {
      await apiClient.post(apiConfig.endpoints.committeeJuryMembers(committeeId), { userId })
      setAddStatus({ loading: false, message: 'Jury member added.', error: '' })
      setUserId('')
      load(page)
    } catch (err) {
      const msg = err.response?.status === 409 ? 'Already a jury member.' : getApiError(err)
      setAddStatus({ loading: false, message: '', error: msg })
    }
  }

  const handleRemove = async (uid) => {
    if (!window.confirm('Remove this jury member?')) return
    try {
      await apiClient.delete(apiConfig.endpoints.committeeJuryMemberByUser(committeeId, uid))
      load(page)
    } catch (err) {
      alert(getApiError(err))
    }
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="py-12 text-center text-sm text-slate-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">No jury members yet.</p>
      ) : (
        <div className="divide-y divide-[#1e293b]">
          {items.map((item) => {
            const uid = item.userId || item._id
            return (
              <div key={uid} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-mono text-slate-200">{uid}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Assigned {new Date(item.assignedAt || item.createdAt).toLocaleString()}
                    {item.assignedBy ? ` · by ${item.assignedBy}` : ''}
                  </p>
                </div>
                <RemoveButton onClick={() => handleRemove(uid)} />
              </div>
            )
          })}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPrev={() => { const p = page - 1; setPage(p); load(p) }}
        onNext={() => { const p = page + 1; setPage(p); load(p) }}
      />

      <form onSubmit={handleAdd} className="flex gap-2 border-t border-[#1e293b] pt-4 items-end">
        <div className="flex-1">
          <EntitySearchSelect
            endpoint={apiConfig.endpoints.userSearch}
            searchField="email"
            returnField="_id"
            displayField="email"
            value={userId}
            onChange={setUserId}
            placeholder="Search user by email"
            required
          />
        </div>
        <button
          type="submit"
          disabled={addStatus.loading}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {addStatus.loading ? 'Adding…' : 'Add Jury'}
        </button>
      </form>
      <StatusLine message={addStatus.message} error={addStatus.error} />
    </div>
  )
}

// ─── Advisors Tab ─────────────────────────────────────────────────────────────

function AdvisorsTab({ committeeId, onAdvisorsLoaded }) {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [advisorId, setAdvisorId] = useState('')
  const [source, setSource] = useState('PRIMARY_ADVISOR')
  const [addStatus, setAddStatus] = useState({ message: '', error: '', loading: false })

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    setError('')
    try {
      const res = await apiClient.get(
        `${apiConfig.endpoints.committeeAdvisors(committeeId)}?page=${p}&limit=10`
      )
      const body = res.data
      const list = body.data || body.items || []
      setItems(list)
      setTotalPages(body.meta?.totalPages || 1)
      if (onAdvisorsLoaded) onAdvisorsLoaded(list)
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setLoading(false)
    }
  }, [committeeId, onAdvisorsLoaded])

  useEffect(() => { load(1) }, [load])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!advisorId) {
      setAddStatus({ loading: false, message: '', error: 'Select an advisor from the search results first.' })
      return
    }
    setAddStatus({ loading: true, message: '', error: '' })
    try {
      await apiClient.post(apiConfig.endpoints.committeeAdvisors(committeeId), {
        advisorId,
        assignmentSource: source,
      })
      setAddStatus({ loading: false, message: 'Advisor added.', error: '' })
      setAdvisorId('')
      load(page)
    } catch (err) {
      const msg = err.response?.status === 409 ? 'Advisor already assigned.' : getApiError(err)
      setAddStatus({ loading: false, message: '', error: msg })
    }
  }

  const handleRemove = async (uid) => {
    if (!window.confirm('Remove this advisor?')) return
    try {
      await apiClient.delete(apiConfig.endpoints.committeeAdvisorByUser(committeeId, uid))
      load(page)
    } catch (err) {
      alert(getApiError(err))
    }
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="py-12 text-center text-sm text-slate-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">No advisors assigned yet.</p>
      ) : (
        <div className="divide-y divide-[#1e293b]">
          {items.map((item) => {
            const uid = item.advisorUserId || item._id
            const isPrimary = item.assignmentSource === 'PRIMARY_ADVISOR'
            return (
              <div key={uid} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-mono text-slate-200">{uid}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Assigned {new Date(item.assignedAt || item.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    label={isPrimary ? 'Primary' : 'Jury'}
                    variant={isPrimary ? 'blue' : 'purple'}
                  />
                  <RemoveButton onClick={() => handleRemove(uid)} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPrev={() => { const p = page - 1; setPage(p); load(p) }}
        onNext={() => { const p = page + 1; setPage(p); load(p) }}
      />

      <form
        onSubmit={handleAdd}
        className="flex flex-col sm:flex-row gap-2 border-t border-[#1e293b] pt-4"
      >
        <div className="flex-1">
          <EntitySearchSelect
            endpoint={apiConfig.endpoints.userSearch}
            searchField="email"
            returnField="_id"
            displayField="email"
            value={advisorId}
            onChange={setAdvisorId}
            placeholder="Search advisor by email"
            required
          />
        </div>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60"
        >
          <option value="PRIMARY_ADVISOR">Primary Advisor</option>
          <option value="JURY_MEMBER">Jury Member</option>
        </select>
        <button
          type="submit"
          disabled={addStatus.loading}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {addStatus.loading ? 'Adding…' : 'Add Advisor'}
        </button>
      </form>
      <StatusLine message={addStatus.message} error={addStatus.error} />
    </div>
  )
}

// ─── Groups Tab ───────────────────────────────────────────────────────────────

function GroupsTab({ committeeId }) {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [groupId, setGroupId] = useState('')
  const [addStatus, setAddStatus] = useState({ message: '', error: '', loading: false })
  const [isWindowOpen, setIsWindowOpen] = useState(false)

  const loadSchedule = useCallback(async () => {
    try {
      const res = await apiClient.get(
        `${apiConfig.endpoints.schedulesActive}?phase=COMMITTEE_ASSIGNMENT`
      )
      const s = res.data
      setIsWindowOpen(
        s && new Date() >= new Date(s.startDatetime) && new Date() <= new Date(s.endDatetime)
      )
    } catch {
      setIsWindowOpen(false)
    }
  }, [])

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    setError('')
    try {
      const res = await apiClient.get(
        `${apiConfig.endpoints.committeeGroups(committeeId)}?page=${p}&limit=10`
      )
      const body = res.data
      setItems(body.data || body.items || [])
      setTotalPages(body.meta?.totalPages || 1)
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setLoading(false)
    }
  }, [committeeId])

  useEffect(() => {
    loadSchedule()
    load(1)
  }, [loadSchedule, load])

  const handleAdd = async (e) => {
    e.preventDefault()
    setAddStatus({ loading: true, message: '', error: '' })
    try {
      await apiClient.post(apiConfig.endpoints.committeeGroups(committeeId), { groupId })
      setAddStatus({ loading: false, message: 'Group assigned.', error: '' })
      setGroupId('')
      load(page)
    } catch (err) {
      const status = err.response?.status
      let msg = getApiError(err)
      if (status === 423) msg = 'Assignment window is closed. Set a window in the Committees page.'
      else if (status === 422) msg = 'Group has no confirmed advisor yet.'
      else if (status === 409) msg = 'Group is already assigned to a committee.'
      setAddStatus({ loading: false, message: '', error: msg })
    }
  }

  const handleRemove = async (gid) => {
    if (!window.confirm('Remove this group from the committee?')) return
    try {
      await apiClient.delete(apiConfig.endpoints.committeeGroupById(committeeId, gid))
      load(page)
    } catch (err) {
      alert(getApiError(err))
    }
  }

  return (
    <div className="space-y-4">
      {!isWindowOpen && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3">
          <span className="text-sm font-medium text-amber-400">Assignment window is closed</span>
          <span className="text-xs text-amber-400/60">
            · Configure it in the Committees list page
          </span>
        </div>
      )}

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">No groups assigned yet.</p>
      ) : (
        <div className="divide-y divide-[#1e293b]">
          {items.map((item) => {
            const gid = item.groupId || item._id
            return (
              <div key={gid} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-mono text-slate-200">{gid}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Assigned {new Date(item.assignedAt || item.createdAt).toLocaleString()}
                    {item.assignedBy ? ` · by ${item.assignedBy}` : ''}
                  </p>
                </div>
                <RemoveButton onClick={() => handleRemove(gid)} />
              </div>
            )
          })}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPrev={() => { const p = page - 1; setPage(p); load(p) }}
        onNext={() => { const p = page + 1; setPage(p); load(p) }}
      />

      <form onSubmit={handleAdd} className="flex gap-2 border-t border-[#1e293b] pt-4 items-end">
        {isWindowOpen ? (
          <div className="flex-1">
            <EntitySearchSelect
              endpoint={apiConfig.endpoints.groups}
              buildParams={(q) => ({ name: q, page: 1, limit: 20 })}
              getItems={(res) => res.data}
              returnField="groupId"
              displayField="groupName"
              value={groupId}
              onChange={setGroupId}
              placeholder="Search group by name"
              required
            />
          </div>
        ) : (
          <p className="flex-1 text-xs text-slate-500 py-2.5">Select a group once the assignment window is open.</p>
        )}
        <button
          type="submit"
          disabled={addStatus.loading || !isWindowOpen}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
        >
          {addStatus.loading ? 'Assigning…' : 'Assign Group'}
        </button>
      </form>
      <StatusLine message={addStatus.message} error={addStatus.error} />
    </div>
  )
}

// ─── Grading Scope Tab ────────────────────────────────────────────────────────

function GradingScopeTab({ committeeId, advisorList }) {
  const [selectedAdvisor, setSelectedAdvisor] = useState('')
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [advisorDisplayMap, setAdvisorDisplayMap] = useState({})

  useEffect(() => {
    apiClient.get(apiConfig.endpoints.advisors, { params: { page: 1, limit: 100 } })
      .then((r) => {
        const list = r.data?.data ?? []
        const map = {}
        list.forEach((a) => {
          const key = a.advisorId || a._id
          if (key) map[key] = a.name ? `${a.name} (${a.email})` : (a.email ?? key)
        })
        setAdvisorDisplayMap(map)
      })
      .catch(() => {})
  }, [])

  const loadScope = useCallback(async (advisorId, p = 1) => {
    if (!advisorId) return
    setLoading(true)
    setError('')
    try {
      const res = await apiClient.get(
        `${apiConfig.endpoints.committeeAdvisorGradingScope(committeeId, advisorId)}?page=${p}&limit=10`
      )
      const body = res.data
      setItems(body.data || body.items || [])
      setTotalPages(body.meta?.totalPages || 1)
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setLoading(false)
    }
  }, [committeeId])

  const handleSelect = (e) => {
    const id = e.target.value
    setSelectedAdvisor(id)
    setPage(1)
    setItems([])
    loadScope(id, 1)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Advisor</label>
        <select
          value={selectedAdvisor}
          onChange={handleSelect}
          className="w-full sm:w-auto rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60"
        >
          <option value="">— Select an advisor —</option>
          {advisorList.map((a) => {
            const uid = a.advisorUserId || a._id
            return (
              <option key={uid} value={uid}>
                {advisorDisplayMap[uid] || uid}
              </option>
            )
          })}
        </select>
      </div>

      {!selectedAdvisor ? (
        <p className="py-12 text-center text-sm text-slate-500">
          Select an advisor to see their grading scope.
        </p>
      ) : loading ? (
        <p className="py-12 text-center text-sm text-slate-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">No groups in grading scope.</p>
      ) : (
        <>
          <div className="divide-y divide-[#1e293b]">
            {items.map((item) => {
              const gid = item.groupId || item._id
              return (
                <div key={gid} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-mono text-slate-200">{gid}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Original advisor: {item.originalAdvisorId || item.advisorUserId || '—'}
                      {item.assignedAt
                        ? ` · ${new Date(item.assignedAt).toLocaleString()}`
                        : ''}
                    </p>
                  </div>
                  <Badge
                    label={item.isOwnGroup ? 'Own' : 'Other'}
                    variant={item.isOwnGroup ? 'green' : 'default'}
                  />
                </div>
              )
            })}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={() => { const p = page - 1; setPage(p); loadScope(selectedAdvisor, p) }}
            onNext={() => { const p = page + 1; setPage(p); loadScope(selectedAdvisor, p) }}
          />
        </>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CommitteeDetailPage() {
  const { committeeId } = useParams()
  const navigate = useNavigate()

  const [committee, setCommittee] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editStatus, setEditStatus] = useState({ loading: false, error: '' })

  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState({ loading: false, error: '' })

  const [advisorList, setAdvisorList] = useState([])

  const fetchCommittee = useCallback(async () => {
    try {
      const res = await apiClient.get(apiConfig.endpoints.committeeById(committeeId))
      setCommittee(res.data)
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true)
    }
  }, [committeeId])

  useEffect(() => { fetchCommittee() }, [fetchCommittee])

  const handleSaveName = async () => {
    setEditStatus({ loading: true, error: '' })
    try {
      await apiClient.patch(apiConfig.endpoints.committeeById(committeeId), { name: editName })
      setEditStatus({ loading: false, error: '' })
      setEditing(false)
      fetchCommittee()
    } catch (err) {
      setEditStatus({ loading: false, error: getApiError(err) })
    }
  }

  const handleDelete = async () => {
    setDeleteStatus({ loading: true, error: '' })
    try {
      await apiClient.delete(apiConfig.endpoints.committeeById(committeeId))
      navigate('/admin/committees')
    } catch (err) {
      setDeleteStatus({ loading: false, error: getApiError(err) })
    }
  }

  if (notFound) {
    return (
      <div className="max-w-4xl mx-auto p-1">
        <div className="rounded-2xl border border-[#1e293b] bg-[#111827] p-10 text-center">
          <p className="text-sm text-slate-400">Committee not found.</p>
          <button
            onClick={() => navigate('/admin/committees')}
            className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            ← Back to committees
          </button>
        </div>
      </div>
    )
  }

  if (!committee) {
    return (
      <div className="max-w-4xl mx-auto p-1">
        <div className="rounded-2xl border border-[#1e293b] bg-[#111827] p-10 text-center">
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 p-1">

      {/* Header card */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#111827] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2 text-lg font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60"
                />
                <button
                  onClick={handleSaveName}
                  disabled={editStatus.loading}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {editStatus.loading ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="text-sm text-slate-400 hover:text-slate-200 px-2 py-2 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <h1 className="text-xl font-semibold text-slate-200 truncate">{committee.name}</h1>
            )}
            {editStatus.error && (
              <p className="mt-1 text-xs text-red-400">{editStatus.error}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              {committee.advisorCount ?? 0} advisors &middot; {committee.groupCount ?? 0} groups
              {committee.createdAt
                ? ` · Created ${new Date(committee.createdAt).toLocaleDateString()}`
                : ''}
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            {!editing && (
              <button
                onClick={() => { setEditing(true); setEditName(committee.name) }}
                className="rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2 text-sm font-bold text-slate-300 hover:border-slate-600 hover:text-slate-100"
              >
                Edit
              </button>
            )}
            <button
              onClick={() => setDeleteConfirm(true)}
              className="rounded-xl border border-red-500/30 bg-red-600/10 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-600/20"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Tabs card */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#111827]">
        {/* Tab bar */}
        <div className="flex border-b border-[#1e293b] overflow-x-auto">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`shrink-0 px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === i
                  ? 'border-b-2 border-blue-500 text-blue-400 bg-blue-600/10'
                  : 'text-slate-500 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === 0 && <JuryTab committeeId={committeeId} />}
          {activeTab === 1 && (
            <AdvisorsTab
              committeeId={committeeId}
              onAdvisorsLoaded={setAdvisorList}
            />
          )}
          {activeTab === 2 && <GroupsTab committeeId={committeeId} />}
          {activeTab === 3 && (
            <GradingScopeTab committeeId={committeeId} advisorList={advisorList} />
          )}
        </div>
      </div>

      {/* Delete modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#1e293b] bg-[#0d1729] p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-bold text-red-400">Delete Committee</h3>
            <p className="mb-4 text-sm text-slate-400">
              Permanently delete{' '}
              <strong className="text-slate-200">{committee.name}</strong>? All assignments will be
              removed. Groups will not be deleted.
            </p>
            {deleteStatus.error && (
              <p className="mb-3 text-sm text-red-400">{deleteStatus.error}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(false)}
                disabled={deleteStatus.loading}
                className="rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm font-bold text-slate-300 hover:border-slate-600 hover:text-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteStatus.loading}
                className="rounded-xl border border-red-500/30 bg-red-600/10 px-4 py-2.5 text-sm font-bold text-red-400 hover:bg-red-600/20 disabled:opacity-50"
              >
                {deleteStatus.loading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
