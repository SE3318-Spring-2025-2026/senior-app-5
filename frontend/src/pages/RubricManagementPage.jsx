import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Trash2, Plus, ChevronDown, ChevronRight, Package, BookOpen,
} from 'lucide-react';
import apiClient from '../utils/apiClient';
import { PageHeader } from '../components/ui';

const emptyQuestion = () => ({ criteriaName: '', criteriaWeight: '' });

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
      const res = await apiClient.get(
        `/deliverables/${deliverable.deliverableId}/rubrics`,
        { params: { limit: 100 } },
      );
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
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)));
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
    if (Math.abs(totalWeight - 100) > 0.1) {
      toast.error(`Question weights must sum to 100% (current: ${totalWeight.toFixed(1)}%).`);
      return;
    }

    const payload = {
      deliverableId: selectedDeliverable.deliverableId,
      name: rubricName.trim(),
      gradingType,
      questions: questions.map((q) => ({
        criteriaName: q.criteriaName.trim(),
        criteriaWeight: parseFloat(q.criteriaWeight) / 100,
      })),
    };

    setSubmitting(true);
    try {
      const res = await apiClient.post(
        `/deliverables/${selectedDeliverable.deliverableId}/rubrics`,
        payload,
      );
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
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        eyebrow="Coordinator"
        title="Rubric Management"
        subtitle="Create and manage evaluation rubrics per deliverable."
      />

      {/* Deliverables list */}
      <section className="rounded-2xl border border-[#1f1f23] bg-[#131316] p-5">
        <SectionLabel icon={Package}>Deliverables</SectionLabel>

        {deliverables.length === 0 ? (
          <p className="text-[13px] text-zinc-600">No deliverables found.</p>
        ) : (
          <ul className="space-y-1">
            {deliverables.map((d) => {
              const active = selectedDeliverable?.deliverableId === d.deliverableId;
              return (
                <li key={d.deliverableId}>
                  <button
                    type="button"
                    onClick={() => loadRubrics(d)}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] transition-colors ${
                      active
                        ? 'bg-[#18181c] text-zinc-100'
                        : 'text-zinc-400 hover:bg-[#18181c] hover:text-zinc-200'
                    }`}
                  >
                    {active ? (
                      <ChevronDown size={13} className="text-zinc-500" />
                    ) : (
                      <ChevronRight size={13} className="text-zinc-600" />
                    )}
                    {d.name ?? d.deliverableId}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {selectedDeliverable && (
        <section className="rounded-2xl border border-[#1f1f23] bg-[#131316] p-5">
          <SectionLabel
            icon={BookOpen}
            action={
              <button
                type="button"
                onClick={() => setShowForm((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-3 py-1.5 text-[12px] font-semibold text-zinc-950 transition hover:bg-white"
              >
                <Plus size={12} /> New rubric
              </button>
            }
          >
            Rubrics · {selectedDeliverable.name ?? selectedDeliverable.deliverableId}
          </SectionLabel>

          {showForm && (
            <form
              onSubmit={handleCreateRubric}
              className="mb-5 space-y-4 rounded-xl border border-[#1f1f23] bg-[#0e0e10] p-4"
            >
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Rubric name
                </label>
                <input
                  type="text"
                  value={rubricName}
                  onChange={(e) => setRubricName(e.target.value)}
                  placeholder="e.g. Sprint 1 Scrum Evaluation"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Grading type
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'soft',   label: 'Soft',   hint: 'A=100 B=80 C=60 D=50 F=0' },
                    { value: 'binary', label: 'Binary', hint: 'S=100 F=0' },
                  ].map((opt) => {
                    const active = gradingType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setGradingType(opt.value)}
                        className={`flex-1 rounded-md border px-3 py-2.5 text-left text-[13px] transition-colors ${
                          active
                            ? 'border-[#3a3a40] bg-[#18181c] text-zinc-100'
                            : 'border-[#26262b] bg-[#0a0a0b] text-zinc-400 hover:border-[#3a3a40] hover:text-zinc-200'
                        }`}
                      >
                        <span className="font-semibold">{opt.label}</span>
                        <span className="ml-2 text-[11px] text-zinc-600">{opt.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Questions
                  </p>
                  <span
                    className={`text-[11px] font-medium tabular-nums ${
                      Math.abs(totalWeight - 100) > 0.1 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    Total: {totalWeight.toFixed(1)}%
                  </span>
                </div>
                {questions.map((q, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <input
                      type="text"
                      placeholder="Criteria name"
                      value={q.criteriaName}
                      onChange={(e) => handleQuestionChange(idx, 'criteriaName', e.target.value)}
                      className={`${inputCls} flex-1`}
                    />
                    <div className="relative flex w-28 items-center">
                      <input
                        type="number"
                        placeholder="0–100"
                        step="1"
                        min="0"
                        max="100"
                        value={q.criteriaWeight}
                        onChange={(e) => handleQuestionChange(idx, 'criteriaWeight', e.target.value)}
                        className={`${inputCls} pr-7`}
                      />
                      <span className="pointer-events-none absolute right-3 text-[12px] text-zinc-500">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeQuestion(idx)}
                      className="mt-0.5 rounded-md border border-[#26262b] bg-[#18181c] p-2 text-zinc-500 transition-colors hover:border-rose-500/40 hover:text-rose-400"
                      aria-label="Remove question"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addQuestion}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-400 transition hover:text-zinc-200"
                >
                  <Plus size={12} /> Add question
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-zinc-100 px-4 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#26262b] disabled:text-zinc-600"
                >
                  {submitting ? 'Creating…' : 'Create rubric'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-md border border-[#26262b] bg-[#18181c] px-4 py-2 text-[13px] font-medium text-zinc-300 transition-colors hover:border-[#3a3a40] hover:bg-[#1f1f23] hover:text-zinc-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loadingRubrics ? (
            <p className="text-[13px] text-zinc-600">Loading…</p>
          ) : rubrics.length === 0 ? (
            <p className="text-[13px] text-zinc-600">No rubrics yet.</p>
          ) : (
            <ul className="space-y-3">
              {rubrics.map((r) => (
                <li
                  key={r.rubricId}
                  className="rounded-xl border border-[#1f1f23] bg-[#0e0e10] p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-zinc-200">{r.name}</span>
                      {r.gradingType && (
                        <span className="rounded-md border border-[#26262b] bg-[#18181c] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                          {r.gradingType}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteRubric(r.rubricId)}
                      className="rounded-md border border-[#26262b] bg-[#18181c] p-1.5 text-zinc-500 transition-colors hover:border-rose-500/40 hover:text-rose-400"
                      aria-label="Delete rubric"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <ul className="space-y-1">
                    {(r.questions ?? []).map((q) => (
                      <li
                        key={q.questionId}
                        className="flex justify-between text-[12px] text-zinc-500"
                      >
                        <span>{q.criteriaName}</span>
                        <span className="text-zinc-700">weight: {q.criteriaWeight}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};

export default RubricManagementPage;
