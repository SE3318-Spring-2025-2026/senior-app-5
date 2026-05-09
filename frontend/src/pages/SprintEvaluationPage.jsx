import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import apiClient from '../utils/apiClient';
import { PageHeader, Card } from '../components/ui';

const SOFT_GRADES = ['A', 'B', 'C', 'D', 'F'];
const EVAL_TYPES = ['SCRUM', 'CODE_REVIEW'];

const SprintEvaluationPage = () => {
  const [groups, setGroups] = useState([]);
  const [sprints, setSprints] = useState([]);

  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedSprint, setSelectedSprint] = useState('');
  const [evalType, setEvalType] = useState('SCRUM');

  const [rubric, setRubric] = useState(null);
  const [responses, setResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingRubric, setLoadingRubric] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [reqRes, sprintRes] = await Promise.allSettled([
        apiClient.get('/requests', { params: { status: 'APPROVED', limit: 100 } }),
        apiClient.get('/schedules', { params: { phase: 'SPRINT' } }),
      ]);

      if (reqRes.status === 'fulfilled') {
        const data = reqRes.value.data?.data ?? reqRes.value.data ?? [];
        setGroups(Array.isArray(data) ? data : []);
      }
      if (sprintRes.status === 'fulfilled') {
        const raw = sprintRes.value.data?.data ?? sprintRes.value.data ?? [];
        const list = Array.isArray(raw) ? raw : [];
        // Sort by startDatetime ascending so Sprint 1 is first
        const sorted = [...list].sort(
          (a, b) => new Date(a.startDatetime) - new Date(b.startDatetime),
        );
        setSprints(sorted);
      }
    };
    load();
  }, []);

  // Load rubric whenever evaluation type changes
  useEffect(() => {
    setRubric(null);
    setResponses({});
    const load = async () => {
      setLoadingRubric(true);
      try {
        const res = await apiClient.get(`/rubrics/sprint/${evalType}`);
        setRubric(res.data ?? null);
      } catch {
        setRubric(null);
      } finally {
        setLoadingRubric(false);
      }
    };
    load();
  }, [evalType]);

  const handleGradeChange = (questionId, grade) => {
    setResponses((prev) => ({ ...prev, [questionId]: grade }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGroup || !selectedSprint || !rubric) {
      toast.error('Please select a group and sprint, and ensure a rubric exists for this evaluation type.');
      return;
    }

    const questionIds = rubric.questions.map((q) => q.questionId);
    const missing = questionIds.filter((id) => !responses[id]);
    if (missing.length > 0) {
      toast.error('Please grade all rubric questions.');
      return;
    }

    const payload = {
      groupId: selectedGroup,
      sprintId: selectedSprint,
      evaluationType: evalType,
      rubricId: rubric.rubricId,
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
              {sprints.map((s, idx) => {
                const start = s.startDatetime ? new Date(s.startDatetime).toLocaleDateString() : '';
                const end = s.endDatetime ? new Date(s.endDatetime).toLocaleDateString() : '';
                return (
                  <option key={s.scheduleId} value={s.scheduleId}>
                    {`Sprint ${idx + 1}`}{start ? ` (${start}${end ? ` – ${end}` : ''})` : ''}
                  </option>
                );
              })}
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
                <option key={t} value={t}>{t === 'CODE_REVIEW' ? 'Code Review' : 'Scrum'}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Rubric Questions</p>
            {loadingRubric ? (
              <p className="text-sm text-slate-500">Loading rubric…</p>
            ) : !rubric ? (
              <p className="text-sm text-red-400">
                No active rubric found for <strong>{evalType}</strong>. Ask the coordinator to create one at{' '}
                <span className="font-mono">POST /rubrics/sprint</span>.
              </p>
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
