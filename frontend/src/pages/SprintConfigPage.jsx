import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Trash2, Plus, Pencil, GitBranch } from 'lucide-react';
import apiClient from '../utils/apiClient';
import { PageHeader } from '../components/ui';

const emptyMapping = () => ({ deliverableId: '', contributionPercentage: '' });

const inputCls =
  'w-full rounded-md border border-[#26262b] bg-[#0a0a0b] px-3.5 py-2.5 text-[13px] text-zinc-200 transition-colors focus:border-[#3a3a40] focus:outline-none focus:ring-1 focus:ring-[#3a3a40] disabled:opacity-50 disabled:cursor-not-allowed';

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
  );
}

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
        ? config.deliverableMappings.map((m) => ({
            deliverableId: m.deliverableId,
            contributionPercentage: String(m.contributionPercentage),
          }))
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
    setMappings((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetStoryPoints || isNaN(parseInt(targetStoryPoints, 10))) {
      toast.error('Target story points must be a number.');
      return;
    }

    const parsedMappings = mappings
      .filter((m) => m.deliverableId && m.contributionPercentage)
      .map((m) => ({
        deliverableId: m.deliverableId,
        contributionPercentage: parseFloat(m.contributionPercentage),
      }));

    const payload = {
      targetStoryPoints: parseInt(targetStoryPoints, 10),
      deliverableMappings: parsedMappings,
    };

    setSubmitting(true);
    try {
      if (editingSprintId) {
        const res = await apiClient.patch(`/sprints/${editingSprintId}`, payload);
        setConfigs((prev) => prev.map((c) => (c.sprintId === editingSprintId ? res.data : c)));
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

  const deliverableName = (id) =>
    deliverables.find((d) => d.deliverableId === id)?.name ?? id;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        eyebrow="Coordinator"
        title="Sprint Configuration"
        subtitle="Set sprint → deliverable percentage associations and story-point targets."
        actions={
          <button
            type="button"
            onClick={() => { resetForm(); setShowForm(true); }}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-3.5 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-white"
          >
            <Plus size={13} /> New
          </button>
        }
      />

      {showForm && (
        <section className="rounded-2xl border border-[#1f1f23] bg-[#131316] p-5">
          <SectionLabel icon={GitBranch}>
            {editingSprintId ? 'Edit sprint config' : 'New sprint config'}
          </SectionLabel>

          <form onSubmit={handleSubmit} className="space-y-4">
            {editingSprintId && (
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Sprint ID
                </label>
                <p className="px-1 font-mono text-[12px] text-zinc-500">{editingSprintId}</p>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Target story points
              </label>
              <input
                type="number"
                value={targetStoryPoints}
                onChange={(e) => setTargetStoryPoints(e.target.value)}
                placeholder="e.g. 5"
                min="0"
                className={inputCls}
              />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Deliverable mappings
              </p>
              {mappings.map((m, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={m.deliverableId}
                    onChange={(e) => handleMappingChange(idx, 'deliverableId', e.target.value)}
                    className={`${inputCls} flex-1`}
                  >
                    <option value="">Select deliverable</option>
                    {deliverables.map((d) => (
                      <option key={d.deliverableId} value={d.deliverableId}>
                        {d.name ?? d.deliverableId}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={m.contributionPercentage}
                    onChange={(e) => handleMappingChange(idx, 'contributionPercentage', e.target.value)}
                    placeholder="% (0–100)"
                    min="0"
                    max="100"
                    className={`${inputCls} w-28`}
                  />
                  <button
                    type="button"
                    onClick={() => setMappings((prev) => prev.filter((_, i) => i !== idx))}
                    className="rounded-md border border-[#26262b] bg-[#18181c] p-2 text-zinc-500 transition-colors hover:border-rose-500/40 hover:text-rose-400"
                    aria-label="Remove mapping"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setMappings((prev) => [...prev, emptyMapping()])}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-400 transition hover:text-zinc-200"
              >
                <Plus size={12} /> Add mapping
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-zinc-100 px-4 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#26262b] disabled:text-zinc-600"
              >
                {submitting ? 'Saving…' : editingSprintId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-[#26262b] bg-[#18181c] px-4 py-2 text-[13px] font-medium text-zinc-300 transition-colors hover:border-[#3a3a40] hover:bg-[#1f1f23] hover:text-zinc-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-2xl border border-[#1f1f23] bg-[#131316] p-5">
        <SectionLabel icon={GitBranch}>Sprint configurations</SectionLabel>

        {loading ? (
          <p className="text-[13px] text-zinc-600">Loading…</p>
        ) : configs.length === 0 ? (
          <p className="text-[13px] text-zinc-600">No sprint configs yet.</p>
        ) : (
          <ul className="space-y-2">
            {configs.map((c) => (
              <li
                key={c.sprintId}
                className="rounded-xl border border-[#1f1f23] bg-[#0e0e10] p-3.5 transition-colors hover:border-[#2a2a30] hover:bg-[#18181c]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-zinc-200">{c.sprintId}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      Target: <span className="text-zinc-300 tabular-nums">{c.targetStoryPoints}</span> pts
                    </p>
                    {c.deliverableMappings.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {c.deliverableMappings.map((m, i) => (
                          <li key={i} className="text-[11px] text-zinc-500">
                            {deliverableName(m.deliverableId)}:{' '}
                            <span className="tabular-nums text-zinc-400">{m.contributionPercentage}%</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleEdit(c)}
                      className="rounded-md border border-[#26262b] bg-[#18181c] p-1.5 text-zinc-400 transition-colors hover:border-[#3a3a40] hover:text-zinc-100"
                      aria-label="Edit sprint config"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.sprintId)}
                      className="rounded-md border border-[#26262b] bg-[#18181c] p-1.5 text-zinc-500 transition-colors hover:border-rose-500/40 hover:text-rose-400"
                      aria-label="Delete sprint config"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default SprintConfigPage;
