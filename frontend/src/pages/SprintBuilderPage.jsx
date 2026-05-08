import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { Plus, Trash2, Pencil, Save, X, SplitSquareHorizontal } from 'lucide-react'
import apiClient from '../utils/apiClient'
import { PageHeader, Badge, Card } from '../components/ui'

const PHASE = 'SPRINT'

function getApiError(error) {
  const msg = error?.response?.data?.message
  return Array.isArray(msg) ? msg.join(', ') : msg || error.message || 'Unexpected error.'
}

function addDaysUTC(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function isMonday(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr + 'T00:00:00Z').getUTCDay() === 1
}

function sprintStatus(sch) {
  const now = Date.now()
  const start = new Date(sch.startDatetime).getTime()
  const end = new Date(sch.endDatetime).getTime()
  if (now >= start && now <= end) return 'open'
  if (now < start) return 'scheduled'
  return 'closed'
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  })
}

function toDatetimeLocal(iso) {
  if (!iso) return ''
  return iso.slice(0, 16)
}

// mappings[deliverableId][sprintId] = { checked: boolean, pct: string }
function buildMappings(schs, cfgs, dels) {
  const result = {}
  for (const del of dels) {
    result[del.deliverableId] = {}
    for (const sch of schs) {
      const cfg = cfgs.find((c) => c.sprintId === sch.scheduleId)
      const existing = cfg?.deliverableMappings?.find((m) => m.deliverableId === del.deliverableId)
      result[del.deliverableId][sch.scheduleId] = {
        checked: !!existing,
        pct: existing ? String(existing.contributionPercentage) : '',
      }
    }
  }
  return result
}

function equalSplit(n) {
  if (n === 0) return ''
  // keep one decimal, e.g. 33.3
  return String(Math.round((100 / n) * 10) / 10)
}

function SprintBuilderPage() {
  const [schedules, setSchedules] = useState([])
  const [sprintConfigs, setSprintConfigs] = useState([])
  const [deliverables, setDeliverables] = useState([])
  const [loading, setLoading] = useState(true)

  const [showNewForm, setShowNewForm] = useState(false)
  const [newForm, setNewForm] = useState({
    startDate: '',
    startTime: '09:00',
    endTime: '23:59',
    targetStoryPoints: '',
  })
  const [creating, setCreating] = useState(false)

  const [editingWindowId, setEditingWindowId] = useState(null)
  const [editWindowForm, setEditWindowForm] = useState({ startDatetime: '', endDatetime: '' })

  const [savingDeliverable, setSavingDeliverable] = useState(null)
  // mappings[deliverableId][sprintId] = { checked: boolean, pct: string }
  const [mappings, setMappings] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [schRes, cfgRes, delRes] = await Promise.all([
        apiClient.get('/schedules', { params: { phase: PHASE } }),
        apiClient.get('/sprints', { params: { limit: 100 } }),
        apiClient.get('/deliverables', { params: { limit: 100 } }),
      ])
      const schs = Array.isArray(schRes.data) ? schRes.data : []
      const rawCfg = cfgRes.data?.data ?? cfgRes.data
      const cfgs = Array.isArray(rawCfg) ? rawCfg : []
      const rawDel = delRes.data?.data ?? delRes.data
      const dels = Array.isArray(rawDel) ? rawDel : []

      setSchedules(schs)
      setSprintConfigs(cfgs)
      setDeliverables(dels)
      setMappings(buildMappings(schs, cfgs, dels))
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const derivedEndDate =
    newForm.startDate && isMonday(newForm.startDate)
      ? addDaysUTC(newForm.startDate, 11)
      : null

  // ── Sprint window handlers ────────────────────────────────────────────────

  const handleCreateSprint = async (e) => {
    e.preventDefault()
    if (!isMonday(newForm.startDate)) {
      toast.error('Start date must be a Monday.')
      return
    }
    if (!newForm.targetStoryPoints || isNaN(parseInt(newForm.targetStoryPoints, 10))) {
      toast.error('Target story points must be a number.')
      return
    }
    const startDatetime = `${newForm.startDate}T${newForm.startTime}:00.000Z`
    const endDatetime = `${derivedEndDate}T${newForm.endTime}:00.000Z`

    setCreating(true)
    try {
      const schRes = await apiClient.post('/schedules', { phase: PHASE, startDatetime, endDatetime })
      const scheduleId = schRes.data.scheduleId
      await apiClient.post('/sprints', {
        sprintId: scheduleId,
        targetStoryPoints: parseInt(newForm.targetStoryPoints, 10),
        deliverableMappings: [],
      })
      toast.success('Sprint created.')
      setNewForm({ startDate: '', startTime: '09:00', endTime: '23:59', targetStoryPoints: '' })
      setShowNewForm(false)
      await load()
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteSprint = async (scheduleId) => {
    if (!confirm('Delete this sprint and its configuration? This cannot be undone.')) return
    try {
      await apiClient.delete(`/schedules/${scheduleId}`)
      await apiClient.delete(`/sprints/${scheduleId}`).catch(() => {})
      toast.success('Sprint deleted.')
      await load()
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  const startEditWindow = (sch) => {
    setEditingWindowId(sch.scheduleId)
    setEditWindowForm({
      startDatetime: toDatetimeLocal(sch.startDatetime),
      endDatetime: toDatetimeLocal(sch.endDatetime),
    })
  }

  const handleSaveWindow = async (scheduleId) => {
    try {
      await apiClient.patch(`/schedules/${scheduleId}`, {
        startDatetime: new Date(editWindowForm.startDatetime).toISOString(),
        endDatetime: new Date(editWindowForm.endDatetime).toISOString(),
      })
      toast.success('Sprint window updated.')
      setEditingWindowId(null)
      await load()
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  // ── Deliverable mapping handlers ──────────────────────────────────────────

  const toggleSprint = (deliverableId, sprintId, checked) => {
    setMappings((prev) => ({
      ...prev,
      [deliverableId]: {
        ...prev[deliverableId],
        [sprintId]: { checked, pct: checked ? prev[deliverableId]?.[sprintId]?.pct || '' : '' },
      },
    }))
  }

  const setPct = (deliverableId, sprintId, value) => {
    setMappings((prev) => ({
      ...prev,
      [deliverableId]: {
        ...prev[deliverableId],
        [sprintId]: { ...prev[deliverableId]?.[sprintId], pct: value },
      },
    }))
  }

  const applyEqualSplit = (deliverableId) => {
    setMappings((prev) => {
      const delivMap = prev[deliverableId] ?? {}
      const checkedIds = Object.entries(delivMap)
        .filter(([, v]) => v.checked)
        .map(([id]) => id)
      if (checkedIds.length === 0) return prev
      const pct = equalSplit(checkedIds.length)
      const updated = { ...delivMap }
      for (const id of checkedIds) {
        updated[id] = { ...updated[id], pct }
      }
      return { ...prev, [deliverableId]: updated }
    })
  }

  const totalForDeliverable = (deliverableId) => {
    const delivMap = mappings[deliverableId] ?? {}
    return Object.values(delivMap).reduce((sum, { checked, pct }) => {
      if (!checked) return sum
      const v = parseFloat(pct)
      return sum + (isNaN(v) ? 0 : v)
    }, 0)
  }

  const checkedCountForDeliverable = (deliverableId) =>
    Object.values(mappings[deliverableId] ?? {}).filter((v) => v.checked).length

  const handleSaveDeliverableMappings = async (deliverableId) => {
    setSavingDeliverable(deliverableId)
    try {
      // Ensure every schedule has a matching sprint config (creates one if missing).
      // This bridges old schedules that were created without a paired sprint config.
      let liveConfigs = [...sprintConfigs]
      for (const sch of schedules) {
        const alreadyLinked = liveConfigs.some((c) => c.sprintId === sch.scheduleId)
        if (!alreadyLinked) {
          try {
            const res = await apiClient.post('/sprints', {
              sprintId: sch.scheduleId,
              targetStoryPoints: 0,
              deliverableMappings: [],
            })
            liveConfigs = [...liveConfigs, res.data]
          } catch {
            // 409 = config already exists with this id in a concurrent request; re-fetch below
          }
        }
      }

      await Promise.all(
        schedules.map(async (sch) => {
          const cfg = liveConfigs.find((c) => c.sprintId === sch.scheduleId)
          if (!cfg) return
          const entry = mappings[deliverableId]?.[sch.scheduleId]
          const pct = entry?.checked ? parseFloat(entry.pct) : null
          const otherMappings = (cfg.deliverableMappings ?? []).filter(
            (m) => m.deliverableId !== deliverableId,
          )
          const newMappings =
            pct !== null && !isNaN(pct)
              ? [...otherMappings, { deliverableId, contributionPercentage: pct }]
              : otherMappings
          await apiClient.patch(`/sprints/${sch.scheduleId}`, { deliverableMappings: newMappings })
        }),
      )
      toast.success('Mappings saved.')
      await load()
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setSavingDeliverable(null)
    }
  }

  // ── Status helpers ────────────────────────────────────────────────────────

  const statusColor = (status) => {
    if (status === 'open') return 'green'
    if (status === 'scheduled') return 'blue'
    return 'slate'
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-1">
      <PageHeader
        title="Sprint Builder"
        subtitle="Configure sprint evaluation windows and deliverable contribution weights."
      />

      {/* ── Sprint Windows ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Sprint Windows</h2>
          <button
            type="button"
            onClick={() => setShowNewForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={14} /> Add Sprint
          </button>
        </div>

        {showNewForm && (
          <Card className="mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">New Sprint</p>
            <form onSubmit={handleCreateSprint} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Start Date <span className="font-normal text-slate-500">(Monday)</span>
                  </label>
                  <input
                    type="date"
                    value={newForm.startDate}
                    onChange={(e) => setNewForm((p) => ({ ...p, startDate: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60"
                  />
                  {newForm.startDate && !isMonday(newForm.startDate) && (
                    <p className="text-xs text-red-400 mt-1">Must be a Monday.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    End Date <span className="font-normal text-slate-500">(auto: +11 days, Friday)</span>
                  </label>
                  <div className="w-full rounded-xl border border-[#1e293b] bg-[#0d1526] px-3 py-2 text-sm text-slate-500 select-none">
                    {derivedEndDate ? fmtDate(derivedEndDate + 'T00:00:00Z') : '—'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Start Time (UTC)</label>
                  <input
                    type="time"
                    value={newForm.startTime}
                    onChange={(e) => setNewForm((p) => ({ ...p, startTime: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">End Time (UTC)</label>
                  <input
                    type="time"
                    value={newForm.endTime}
                    onChange={(e) => setNewForm((p) => ({ ...p, endTime: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60"
                  />
                </div>
              </div>
              <div className="max-w-48">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Target Story Points</label>
                <input
                  type="number"
                  value={newForm.targetStoryPoints}
                  onChange={(e) => setNewForm((p) => ({ ...p, targetStoryPoints: e.target.value }))}
                  placeholder="e.g. 8"
                  min="0"
                  required
                  className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creating || !derivedEndDate}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating…' : 'Create Sprint'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="rounded-xl border border-[#1e293b] px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <p className="text-sm text-slate-500 py-2">Loading…</p>
        ) : schedules.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">No sprints created yet. Click "Add Sprint" to get started.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {schedules.map((sch, idx) => {
              const status = sprintStatus(sch)
              const cfg = sprintConfigs.find((c) => c.sprintId === sch.scheduleId)
              const isEditingWindow = editingWindowId === sch.scheduleId

              return (
                <Card key={sch.scheduleId}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-bold text-slate-200">Sprint {idx + 1}</span>
                        <Badge color={statusColor(status)}>
                          {status === 'open' ? 'Open' : status === 'scheduled' ? 'Scheduled' : 'Closed'}
                        </Badge>
                      </div>

                      {isEditingWindow ? (
                        <div className="mt-2 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Start (UTC)</label>
                              <input
                                type="datetime-local"
                                value={editWindowForm.startDatetime}
                                onChange={(e) =>
                                  setEditWindowForm((p) => ({ ...p, startDatetime: e.target.value }))
                                }
                                className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-xs text-slate-200"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">End (UTC)</label>
                              <input
                                type="datetime-local"
                                value={editWindowForm.endDatetime}
                                onChange={(e) =>
                                  setEditWindowForm((p) => ({ ...p, endDatetime: e.target.value }))
                                }
                                className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-xs text-slate-200"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveWindow(sch.scheduleId)}
                              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                            >
                              <Save size={12} /> Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingWindowId(null)}
                              className="flex items-center gap-1.5 rounded-xl border border-[#1e293b] px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                            >
                              <X size={12} /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-slate-400">
                            {fmtDate(sch.startDatetime)} {fmtTime(sch.startDatetime)} →{' '}
                            {fmtDate(sch.endDatetime)} {fmtTime(sch.endDatetime)}
                          </p>
                          {cfg && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              Target: {cfg.targetStoryPoints} pts
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {!isEditingWindow && (
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditWindow(sch)}
                          title="Edit window times"
                          className="text-slate-500 hover:text-blue-400"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSprint(sch.scheduleId)}
                          title="Delete sprint"
                          className="text-slate-500 hover:text-red-400"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Deliverable Contribution Map ──────────────────────────────── */}
      {!loading && schedules.length > 0 && deliverables.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
            Deliverable Contribution Map
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Select which sprints feed into each deliverable and set their weight. Checked sprints must total exactly 100%.
          </p>

          <div className="space-y-4">
            {deliverables.map((del) => {
              const total = Math.round(totalForDeliverable(del.deliverableId) * 10) / 10
              const checkedCount = checkedCountForDeliverable(del.deliverableId)
              const overLimit = total > 100
              const isComplete = total === 100 && checkedCount > 0

              return (
                <Card key={del.deliverableId}>
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{del.name ?? del.deliverableId}</p>
                      <p
                        className={`text-xs mt-0.5 font-medium ${
                          overLimit ? 'text-red-400' : isComplete ? 'text-green-400' : 'text-slate-500'
                        }`}
                      >
                        {checkedCount === 0
                          ? 'No sprints selected'
                          : `${total}% / 100%${overLimit ? ' — exceeds limit' : isComplete ? ' ✓' : ''}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {checkedCount > 0 && (
                        <button
                          type="button"
                          onClick={() => applyEqualSplit(del.deliverableId)}
                          title="Distribute equally across selected sprints"
                          className="flex items-center gap-1.5 rounded-xl border border-[#1e293b] px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600"
                        >
                          <SplitSquareHorizontal size={12} /> Equal split
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSaveDeliverableMappings(del.deliverableId)}
                        disabled={savingDeliverable === del.deliverableId || overLimit}
                        className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save size={12} />
                        {savingDeliverable === del.deliverableId ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>

                  {/* Sprint rows */}
                  <div className="space-y-2">
                    {schedules.map((sch, idx) => {
                      const entry = mappings[del.deliverableId]?.[sch.scheduleId] ?? {
                        checked: false,
                        pct: '',
                      }
                      return (
                        <div
                          key={sch.scheduleId}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                            entry.checked
                              ? 'bg-blue-600/8 border border-blue-600/20'
                              : 'bg-[#0d1526] border border-transparent'
                          }`}
                        >
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            id={`${del.deliverableId}-${sch.scheduleId}`}
                            checked={entry.checked}
                            onChange={(e) => toggleSprint(del.deliverableId, sch.scheduleId, e.target.checked)}
                            className="w-4 h-4 accent-blue-500 shrink-0 cursor-pointer"
                          />

                          {/* Sprint label */}
                          <label
                            htmlFor={`${del.deliverableId}-${sch.scheduleId}`}
                            className={`text-xs font-medium w-16 shrink-0 cursor-pointer ${
                              entry.checked ? 'text-slate-200' : 'text-slate-500'
                            }`}
                          >
                            Sprint {idx + 1}
                          </label>

                          {/* Date range */}
                          <span
                            className={`text-xs flex-1 hidden sm:inline ${
                              entry.checked ? 'text-slate-400' : 'text-slate-600'
                            }`}
                          >
                            {fmtDate(sch.startDatetime)} – {fmtDate(sch.endDatetime)}
                          </span>

                          {/* Percentage input */}
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={entry.pct}
                              onChange={(e) => setPct(del.deliverableId, sch.scheduleId, e.target.value)}
                              disabled={!entry.checked}
                              placeholder="0"
                              min="0"
                              max="100"
                              className="w-20 rounded-xl border border-[#1e293b] bg-[#111827] px-2.5 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60 disabled:opacity-30 disabled:cursor-not-allowed text-right"
                            />
                            <span className={`text-xs ${entry.checked ? 'text-slate-400' : 'text-slate-600'}`}>
                              %
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {!loading && schedules.length === 0 && deliverables.length > 0 && (
        <Card>
          <p className="text-xs text-slate-500">
            Create sprint windows first to configure deliverable contribution weights.
          </p>
        </Card>
      )}
    </div>
  )
}

export default SprintBuilderPage
