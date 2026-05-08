import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Trash2, Plus, Pencil } from 'lucide-react';
import apiClient from '../utils/apiClient';
import { PageHeader, Card } from '../components/ui';

const emptyMapping = () => ({ deliverableId: '', contributionPercentage: '' });

const SprintConfigPage = () => {
  const [configs, setConfigs] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingSprintId, setEditingSprintId] = useState(null);
  const [targetStoryPoints, setTargetStoryPoints] = useState('');
  const [mappings, setMappings] = useState([emptyMapping()]);
  const [submitting, setSubmitting] = useState(false);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/sprints', { params: { limit: 100 } });
      const data = res.data?.data ?? res.data ?? [];
      setConfigs(Array.isArray(data) ? data : []);
    } catch {
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
    apiClient.get('/deliverables', { params: { limit: 100 } })
      .then((res) => {
        const data = res.data?.data ?? res.data ?? [];
        setDeliverables(Array.isArray(data) ? data : []);
      })
      .catch(() => setDeliverables([]));
  }, []);

  const resetForm = () => {
    setEditingSprintId(null);
    setTargetStoryPoints('');
    setMappings([emptyMapping()]);
    setShowForm(false);
  };

  const handleEdit = (config) => {
    setEditingSprintId(config.sprintId);
    setTargetStoryPoints(String(config.targetStoryPoints));
    setMappings(
      config.deliverableMappings.length > 0
        ? config.deliverableMappings.map((m) => ({ deliverableId: m.deliverableId, contributionPercentage: String(m.contributionPercentage) }))
        : [emptyMapping()],
    );
    setShowForm(true);
  };

  const handleDelete = async (sid) => {
    if (!confirm('Delete this sprint config?')) return;
    try {
      await apiClient.delete(`/sprints/${sid}`);
      setConfigs((prev) => prev.filter((c) => c.sprintId !== sid));
      toast.success('Sprint config deleted.');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to delete sprint config.');
    }
  };

  const handleMappingChange = (idx, field, value) => {
    setMappings((prev) => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetStoryPoints || isNaN(parseInt(targetStoryPoints, 10))) { toast.error('Target story points must be a number.'); return; }

    const parsedMappings = mappings
      .filter((m) => m.deliverableId && m.contributionPercentage)
      .map((m) => ({ deliverableId: m.deliverableId, contributionPercentage: parseFloat(m.contributionPercentage) }));

    const payload = {
      targetStoryPoints: parseInt(targetStoryPoints, 10),
      deliverableMappings: parsedMappings,
    };

    setSubmitting(true);
    try {
      if (editingSprintId) {
        const res = await apiClient.patch(`/sprints/${editingSprintId}`, payload);
        setConfigs((prev) => prev.map((c) => c.sprintId === editingSprintId ? res.data : c));
        toast.success('Sprint config updated.');
      } else {
        const res = await apiClient.post('/sprints', payload);
        setConfigs((prev) => [...prev, res.data]);
        toast.success('Sprint config created.');
      }
      resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to save sprint config.');
    } finally {
      setSubmitting(false);
    }
  };

  const deliverableName = (id) => deliverables.find((d) => d.deliverableId === id)?.name ?? id;

  return (
    <div className="max-w-3xl mx-auto space-y-5 p-1">
      <PageHeader title="Sprint Configuration" subtitle="Set sprint → deliverable percentage associations and story point targets" />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={14} /> New Sprint Config
        </button>
      </div>

      {showForm && (
        <Card>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
            {editingSprintId ? 'Edit Sprint Config' : 'New Sprint Config'}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {editingSprintId && (
              <p className="text-xs text-slate-500 px-1">Editing existing sprint config</p>
            )}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-400">Target Story Points</label>
              <input
                type="number"
                value={targetStoryPoints}
                onChange={(e) => setTargetStoryPoints(e.target.value)}
                placeholder="e.g. 5"
                min="0"
                className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400">Deliverable Mappings</p>
              {mappings.map((m, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    value={m.deliverableId}
                    onChange={(e) => handleMappingChange(idx, 'deliverableId', e.target.value)}
                    className="flex-1 rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200"
                  >
                    <option value="">Select deliverable</option>
                    {deliverables.map((d) => (
                      <option key={d.deliverableId} value={d.deliverableId}>{d.name ?? d.deliverableId}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={m.contributionPercentage}
                    onChange={(e) => handleMappingChange(idx, 'contributionPercentage', e.target.value)}
                    placeholder="% (0–100)"
                    min="0"
                    max="100"
                    className="w-28 rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200"
                  />
                  <button type="button" onClick={() => setMappings((prev) => prev.filter((_, i) => i !== idx))} className="text-slate-500 hover:text-red-400">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setMappings((prev) => [...prev, emptyMapping()])} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
                <Plus size={13} /> Add Mapping
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Saving…' : editingSprintId ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={resetForm} className="rounded-xl border border-[#1e293b] px-4 py-2 text-sm text-slate-400 hover:text-slate-200">
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Sprint Configurations</p>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : configs.length === 0 ? (
          <p className="text-sm text-slate-500">No sprint configs yet.</p>
        ) : (
          <ul className="space-y-3">
            {configs.map((c) => (
              <li key={c.sprintId} className="border border-[#1e293b] rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">
                      {c.phase ? `${c.phase} — ` : ''}
                      {c.startDate ? new Date(c.startDate).toLocaleDateString() : '?'} – {c.endDate ? new Date(c.endDate).toLocaleDateString() : '?'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Target: {c.targetStoryPoints} pts</p>
                    {c.deliverableMappings.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {c.deliverableMappings.map((m, i) => (
                          <li key={i} className="text-xs text-slate-400">
                            {deliverableName(m.deliverableId)}: {m.contributionPercentage}%
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => handleEdit(c)} className="text-slate-500 hover:text-blue-400">
                      <Pencil size={15} />
                    </button>
                    <button type="button" onClick={() => handleDelete(c.sprintId)} className="text-slate-500 hover:text-red-400">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default SprintConfigPage;
