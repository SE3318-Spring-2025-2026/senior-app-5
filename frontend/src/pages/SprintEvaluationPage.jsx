import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import apiClient from '../utils/apiClient';
import { PageHeader, Card } from '../components/ui';

const SOFT_GRADES = ['A', 'B', 'C', 'D', 'F'];
const EVAL_TYPES = ['SCRUM', 'CODE_REVIEW'];

const SprintEvaluationPage = () => {
  const [groups, setGroups] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [deliverables, setDeliverables] = useState([]);

  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedSprint, setSelectedSprint] = useState('');
  const [selectedDeliverable, setSelectedDeliverable] = useState('');
  const [evalType, setEvalType] = useState('SCRUM');

  const [rubric, setRubric] = useState(null);
  const [responses, setResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingRubric, setLoadingRubric] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [reqRes, sprintRes, delRes] = await Promise.allSettled([
        apiClient.get('/requests', { params: { status: 'APPROVED', limit: 100 } }),
        apiClient.get('/sprints', { params: { limit: 100 } }),
        apiClient.get('/deliverables', { params: { limit: 100 } }),
      ]);

      if (reqRes.status === 'fulfilled') {
        const data = reqRes.value.data?.data ?? reqRes.value.data ?? [];
        setGroups(Array.isArray(data) ? data : []);
      }
      if (sprintRes.status === 'fulfilled') {
        const data = sprintRes.value.data?.data ?? sprintRes.value.data ?? [];
        setSprints(Array.isArray(data) ? data : []);
      }
      if (delRes.status === 'fulfilled') {
        const data = delRes.value.data?.data ?? delRes.value.data ?? [];
        setDeliverables(Array.isArray(data) ? data : []);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedDeliverable) { setRubric(null); setResponses({}); return; }
    const load = async () => {
      setLoadingRubric(true);
      try {
        const res = await apiClient.get(`/deliverables/${selectedDeliverable}/rubrics`, { params: { limit: 1 } });
        const data = res.data?.data ?? res.data ?? [];
        const first = Array.isArray(data) ? data[0] : null;
        setRubric(first ?? null);
        setResponses({});
      } catch {
        setRubric(null);
      } finally {
        setLoadingRubric(false);
      }
    };
    load();
  }, [selectedDeliverable]);

  const handleGradeChange = (questionId, grade) => {
    setResponses((prev) => ({ ...prev, [questionId]: grade }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGroup || !selectedSprint || !selectedDeliverable || !rubric) {
      toast.error('Please select a group, sprint, deliverable, and ensure a rubric exists.');
      return;
    }

    const rubricId = rubric.rubricId;
    const questionIds = rubric.questions.map((q) => q.questionId);
    const missing = questionIds.filter((id) => !responses[id]);
    if (missing.length > 0) {
      toast.error('Please grade all rubric questions.');
      return;
    }

    const payload = {
      groupId: selectedGroup,
      sprintId: selectedSprint,
      deliverableId: selectedDeliverable,
      evaluationType: evalType,
      rubricId,
      responses: questionIds.map((id) => ({ questionId: id, softGrade: responses[id] })),
    };

    setSubmitting(true);
    try {
      await apiClient.post('/sprint-evaluations', payload);
      toast.success('Sprint evaluation submitted successfully.');
      setResponses({});
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to submit evaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 p-1">
      <PageHeader title="Sprint Evaluation" subtitle="Grade a group's sprint performance" />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-400">Group</label>
            <select
              className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <option value="">Select group</option>
              {groups.map((g) => (
                <option key={g.groupId ?? g.requestId} value={g.groupId}>
                  {g.groupName ?? g.name ?? g.groupId}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-400">Sprint</label>
            <select
              className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200"
              value={selectedSprint}
              onChange={(e) => setSelectedSprint(e.target.value)}
            >
              <option value="">Select sprint</option>
              {sprints.map((s) => (
                <option key={s.sprintId} value={s.sprintId}>
                  {s.phase ? `${s.phase} ` : ''}Sprint ({s.startDate ? new Date(s.startDate).toLocaleDateString() : s.sprintId})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-400">Deliverable</label>
            <select
              className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200"
              value={selectedDeliverable}
              onChange={(e) => setSelectedDeliverable(e.target.value)}
            >
              <option value="">Select deliverable</option>
              {deliverables.map((d) => (
                <option key={d.deliverableId} value={d.deliverableId}>
                  {d.name ?? d.deliverableId}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-400">Evaluation Type</label>
            <select
              className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200"
              value={evalType}
              onChange={(e) => setEvalType(e.target.value)}
            >
              {EVAL_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {selectedDeliverable && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Rubric Questions</p>
              {loadingRubric ? (
                <p className="text-sm text-slate-500">Loading rubric…</p>
              ) : !rubric ? (
                <p className="text-sm text-red-400">No rubric found for this deliverable. Create one first.</p>
              ) : (
                rubric.questions.map((q) => (
                  <div key={q.questionId} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-300 flex-1">
                      {q.criteriaName}
                      <span className="ml-2 text-xs text-slate-500">(weight: {q.criteriaWeight})</span>
                    </span>
                    <div className="flex gap-2">
                      {SOFT_GRADES.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => handleGradeChange(q.questionId, g)}
                          className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${
                            responses[q.questionId] === g
                              ? 'bg-blue-600 text-white'
                              : 'bg-white/5 text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Submitting…' : 'Submit Evaluation'}
          </button>
        </form>
      </Card>
    </div>
  );
};

export default SprintEvaluationPage;
