import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import apiClient from '../utils/apiClient';
import { PageHeader, Card } from '../components/ui';

const emptyForm = () => ({ name: '', deliverablePercentage: '' });

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

  return (
    <div className="max-w-3xl mx-auto space-y-5 p-1">
      <PageHeader
        title="Deliverable Configuration"
        subtitle="Define deliverables and set their weight toward the final grade"
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={14} /> New Deliverable
        </button>
      </div>

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

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-400">
                Weight toward final grade
                <span className="ml-1 font-normal text-slate-500">(%)</span>
              </label>
              <input
                type="number"
                value={form.deliverablePercentage}
                onChange={(e) => setForm((f) => ({ ...f, deliverablePercentage: e.target.value }))}
                placeholder="e.g. 35"
                step="0.5"
                min="0"
                max="100"
                className="w-48 rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Saving…' : editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-[#1e293b] px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Deliverables</p>
          <p className={`text-xs font-semibold tabular-nums ${totalPercentage > 100 ? 'text-red-400' : totalPercentage === 100 ? 'text-green-400' : 'text-slate-400'}`}>
            {totalPercentage.toFixed(1)}% / 100%
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : deliverables.length === 0 ? (
          <p className="text-sm text-slate-500">No deliverables configured yet.</p>
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
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default DeliverableManagementPage;
