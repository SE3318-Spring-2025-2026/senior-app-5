import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import apiClient from '../utils/apiClient';
import { PageHeader, Card } from '../components/ui';

const emptyForm = () => ({ name: '', deliverablePercentage: '' });

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

const DeliverableManagementPage = () => {
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  const loadDeliverables = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/deliverables', { params: { limit: 100 } });
      const data = res.data?.data ?? res.data ?? [];
      setDeliverables(Array.isArray(data) ? data : []);
    } catch {
      setDeliverables([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDeliverables(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(false);
  };

  const handleEdit = (d) => {
    setEditingId(d.deliverableId);
    setForm({ name: d.name, deliverablePercentage: String(d.deliverablePercentage) });
    setShowForm(true);
  };

  const handleDelete = async (d) => {
    if (!confirm(`Delete "${d.name}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/deliverables/${d.deliverableId}`);
      setDeliverables((prev) => prev.filter((x) => x.deliverableId !== d.deliverableId));
      toast.success('Deliverable deleted.');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to delete deliverable.');
    }
  };

  const validate = () => {
    if (!form.name.trim()) { toast.error('Name is required.'); return false; }
    const pct = parseFloat(form.deliverablePercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) { toast.error('Weight must be between 0 and 100.'); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const pct = parseFloat(form.deliverablePercentage);

    setSubmitting(true);
    try {
      if (editingId) {
        const res = await apiClient.patch(`/deliverables/${editingId}`, {
          name: form.name.trim(),
          deliverablePercentage: pct,
        });
        setDeliverables((prev) => prev.map((d) => d.deliverableId === editingId ? res.data : d));
        toast.success('Deliverable updated.');
      } else {
        const res = await apiClient.post('/deliverables', {
          name: form.name.trim(),
          deliverablePercentage: pct,
        });
        setDeliverables((prev) => [...prev, res.data]);
        toast.success('Deliverable created.');
      }
      resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to save deliverable.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPercentage = deliverables.reduce((sum, d) => sum + d.deliverablePercentage, 0);
  const totalColor =
    totalPercentage > 100
      ? 'text-rose-400'
      : totalPercentage === 100
      ? 'text-emerald-400'
      : 'text-zinc-500';

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        eyebrow="Coordinator"
        title="Deliverable Configuration"
        subtitle="Define deliverables and set their weight toward the final grade."
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
        <Card>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
            {editingId ? 'Edit Deliverable' : 'New Deliverable'}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-400">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Statement of Work"
                className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Weight toward final grade <span className="ml-1 normal-case text-zinc-700">(%)</span>
              </label>
              <input
                type="number"
                value={form.deliverablePercentage}
                onChange={(e) => setForm((f) => ({ ...f, deliverablePercentage: e.target.value }))}
                placeholder="e.g. 35"
                step="0.5"
                min="0"
                max="100"
                className={`${inputCls} w-48`}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-zinc-100 px-4 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#26262b] disabled:text-zinc-600"
              >
                {submitting ? 'Saving…' : editingId ? 'Update' : 'Create'}
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
        </Card>
      )}

      <section className="rounded-2xl border border-[#1f1f23] bg-[#131316] p-5">
        <SectionLabel
          icon={Package}
          action={
            <p className={`text-[12px] font-medium tabular-nums ${totalColor}`}>
              {totalPercentage.toFixed(1)}% / 100%
            </p>
          }
        >
          Deliverables
        </SectionLabel>

        {loading ? (
          <p className="text-[13px] text-zinc-600">Loading…</p>
        ) : deliverables.length === 0 ? (
          <p className="text-[13px] text-zinc-600">No deliverables configured yet.</p>
        ) : (
          <ul className="space-y-2">
            {deliverables.map((d) => (
              <li key={d.deliverableId} className="border border-[#1e293b] rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200">{d.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{d.deliverablePercentage}% of final grade</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleEdit(d)}
                      className="text-slate-500 hover:text-blue-400"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(d)}
                      className="text-slate-500 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleEdit(d)}
                  className="rounded-md border border-[#26262b] bg-[#18181c] p-1.5 text-zinc-400 transition-colors hover:border-[#3a3a40] hover:text-zinc-100"
                  aria-label={`Edit ${d.name}`}
                >
                  <Pencil size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default DeliverableManagementPage;
