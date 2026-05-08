import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import apiClient from '../utils/apiClient';
import { PageHeader, Card } from '../components/ui';

const emptyQuestion = () => ({ criteriaName: '', criteriaWeight: '' });

const RubricManagementPage = () => {
  const [deliverables, setDeliverables] = useState([]);
  const [selectedDeliverable, setSelectedDeliverable] = useState(null);
  const [rubrics, setRubrics] = useState([]);
  const [loadingRubrics, setLoadingRubrics] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [rubricName, setRubricName] = useState('');
  const [gradingType, setGradingType] = useState('soft');
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient.get('/deliverables', { params: { limit: 100 } })
      .then((res) => {
        const data = res.data?.data ?? res.data ?? [];
        setDeliverables(Array.isArray(data) ? data : []);
      })
      .catch(() => setDeliverables([]));
  }, []);

  const resetForm = () => {
    setShowForm(false);
    setRubricName('');
    setGradingType('soft');
    setQuestions([emptyQuestion()]);
  };

  const loadRubrics = async (deliverable) => {
    setSelectedDeliverable(deliverable);
    resetForm();
    setLoadingRubrics(true);
    try {
      const res = await apiClient.get(`/deliverables/${deliverable.deliverableId}/rubrics`, { params: { limit: 100 } });
      const data = res.data?.data ?? res.data ?? [];
      setRubrics(Array.isArray(data) ? data : []);
    } catch {
      setRubrics([]);
    } finally {
      setLoadingRubrics(false);
    }
  };

  const handleDeleteRubric = async (rubricId) => {
    if (!confirm('Delete this rubric?')) return;
    try {
      await apiClient.delete(`/deliverables/${selectedDeliverable.deliverableId}/rubrics/${rubricId}`);
      setRubrics((prev) => prev.filter((r) => r.rubricId !== rubricId));
      toast.success('Rubric deleted.');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to delete rubric.');
    }
  };

  const handleQuestionChange = (idx, field, value) => {
    setQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion()]);

  const removeQuestion = (idx) => {
    if (questions.length === 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalWeight = questions.reduce((sum, q) => sum + (parseFloat(q.criteriaWeight) || 0), 0);

  const handleCreateRubric = async (e) => {
    e.preventDefault();
    if (!rubricName.trim()) { toast.error('Rubric name is required.'); return; }
    if (Math.abs(totalWeight - 1.0) > 0.001) {
      toast.error(`Question weights must sum to 1.0 (current: ${totalWeight.toFixed(3)}).`);
      return;
    }

    const payload = {
      deliverableId: selectedDeliverable.deliverableId,
      name: rubricName.trim(),
      gradingType,
      questions: questions.map((q) => ({
        criteriaName: q.criteriaName.trim(),
        criteriaWeight: parseFloat(q.criteriaWeight),
      })),
    };

    setSubmitting(true);
    try {
      const res = await apiClient.post(`/deliverables/${selectedDeliverable.deliverableId}/rubrics`, payload);
      setRubrics((prev) => [...prev, res.data]);
      resetForm();
      toast.success('Rubric created.');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to create rubric.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 p-1">
      <PageHeader title="Rubric Management" subtitle="Create and manage evaluation rubrics per deliverable" />

      <Card>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Deliverables</p>
        {deliverables.length === 0 ? (
          <p className="text-sm text-slate-500">No deliverables found.</p>
        ) : (
          <ul className="space-y-1">
            {deliverables.map((d) => (
              <li key={d.deliverableId}>
                <button
                  type="button"
                  onClick={() => loadRubrics(d)}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedDeliverable?.deliverableId === d.deliverableId
                      ? 'bg-blue-600/20 text-blue-300'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {selectedDeliverable?.deliverableId === d.deliverableId ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  {d.name ?? d.deliverableId}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {selectedDeliverable && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Rubrics for {selectedDeliverable.name ?? selectedDeliverable.deliverableId}
            </p>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={13} /> New Rubric
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreateRubric} className="mb-5 space-y-3 border border-[#1e293b] rounded-xl p-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400">Rubric Name</label>
                <input
                  type="text"
                  value={rubricName}
                  onChange={(e) => setRubricName(e.target.value)}
                  className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200"
                  placeholder="e.g. Sprint 1 Scrum Evaluation"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400">Grading Type</label>
                <div className="flex gap-3">
                  {[
                    { value: 'soft', label: 'Soft', hint: 'A=100 B=80 C=60 D=50 F=0' },
                    { value: 'binary', label: 'Binary', hint: 'S=100 F=0' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGradingType(opt.value)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                        gradingType === opt.value
                          ? 'border-blue-500 bg-blue-600/20 text-blue-300'
                          : 'border-[#1e293b] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="font-semibold">{opt.label}</span>
                      <span className="ml-2 text-xs opacity-60">{opt.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-400">Questions</p>
                  <span className={`text-xs font-semibold ${Math.abs(totalWeight - 1.0) > 0.001 ? 'text-red-400' : 'text-green-400'}`}>
                    Total weight: {totalWeight.toFixed(3)}
                  </span>
                </div>
                {questions.map((q, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <input
                      type="text"
                      placeholder="Criteria name"
                      value={q.criteriaName}
                      onChange={(e) => handleQuestionChange(idx, 'criteriaName', e.target.value)}
                      className="flex-1 rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200"
                    />
                    <input
                      type="number"
                      placeholder="Weight (0-1)"
                      step="0.01"
                      min="0"
                      max="1"
                      value={q.criteriaWeight}
                      onChange={(e) => handleQuestionChange(idx, 'criteriaWeight', e.target.value)}
                      className="w-28 rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200"
                    />
                    <button type="button" onClick={() => removeQuestion(idx)} className="text-slate-500 hover:text-red-400 mt-2">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addQuestion} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
                  <Plus size={13} /> Add Question
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Creating…' : 'Create Rubric'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-[#1e293b] px-4 py-2 text-sm text-slate-400 hover:text-slate-200">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loadingRubrics ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : rubrics.length === 0 ? (
            <p className="text-sm text-slate-500">No rubrics yet.</p>
          ) : (
            <ul className="space-y-3">
              {rubrics.map((r) => (
                <li key={r.rubricId} className="border border-[#1e293b] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-200">{r.name}</span>
                      {r.gradingType && (
                        <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-slate-700 text-slate-300 uppercase">
                          {r.gradingType}
                        </span>
                      )}
                    </div>
                    <button type="button" onClick={() => handleDeleteRubric(r.rubricId)} className="text-slate-500 hover:text-red-400">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <ul className="space-y-1">
                    {(r.questions ?? []).map((q) => (
                      <li key={q.questionId} className="text-xs text-slate-400 flex justify-between">
                        <span>{q.criteriaName}</span>
                        <span className="text-slate-600">weight: {q.criteriaWeight}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
};

export default RubricManagementPage;
