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
  const [gradesOverview, setGradesOverview] = useState({
    loading: false,
    error: '',
    gradedSubmissions: [],
    rubricEvaluations: [],
    rubricByType: {},
  });

  useEffect(() => {
    const load = async () => {
      const [reqRes, sprintRes] = await Promise.allSettled([
        // /groups auto-filters to advisor's own groups when called as Professor
        apiClient.get('/groups', { params: { limit: 100 } }),
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

  useEffect(() => {
    if (!selectedGroup) {
      setGradesOverview({
        loading: false,
        error: '',
        gradedSubmissions: [],
        rubricEvaluations: [],
        rubricByType: {},
      });
      return;
    }

    const loadGradesOverview = async () => {
      setGradesOverview((prev) => ({ ...prev, loading: true, error: '' }));
      const evaluationParams = { groupId: selectedGroup };
      if (selectedSprint) {
        evaluationParams.sprintId = selectedSprint;
      }

      const [submissionsRes, evaluationsRes, scrumRubricRes, codeReviewRubricRes] =
        await Promise.allSettled([
          apiClient.get('/submissions', { params: { groupId: selectedGroup } }),
          apiClient.get('/sprint-evaluations', { params: evaluationParams }),
          apiClient.get('/rubrics/sprint/SCRUM'),
          apiClient.get('/rubrics/sprint/CODE_REVIEW'),
        ]);

      const nextError =
        submissionsRes.status === 'rejected' && evaluationsRes.status === 'rejected'
          ? 'Could not load graded submissions or rubric evaluations.'
          : '';

      const submissionsRaw =
        submissionsRes.status === 'fulfilled'
          ? submissionsRes.value.data?.data ?? submissionsRes.value.data ?? []
          : [];
      const submissions = Array.isArray(submissionsRaw) ? submissionsRaw : [];
      const gradedSubmissions = submissions
        .filter((submission) => Array.isArray(submission.grades) && submission.grades.length > 0)
        .sort((a, b) => new Date(b.createdAt ?? b.submittedAt ?? 0) - new Date(a.createdAt ?? a.submittedAt ?? 0));

      const evaluationsRaw =
        evaluationsRes.status === 'fulfilled'
          ? evaluationsRes.value.data?.data ?? evaluationsRes.value.data ?? []
          : [];
      const rubricEvaluations = Array.isArray(evaluationsRaw) ? evaluationsRaw : [];

      const rubricByType = {};
      if (scrumRubricRes.status === 'fulfilled') {
        rubricByType.SCRUM = scrumRubricRes.value.data ?? null;
      }
      if (codeReviewRubricRes.status === 'fulfilled') {
        rubricByType.CODE_REVIEW = codeReviewRubricRes.value.data ?? null;
      }

      setGradesOverview({
        loading: false,
        error: nextError,
        gradedSubmissions,
        rubricEvaluations,
        rubricByType,
      });
    };

    loadGradesOverview();
  }, [selectedGroup, selectedSprint]);

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

  const sprintLabel = (sprintId) => {
    const sprintIndex = sprints.findIndex((s) => s.scheduleId === sprintId);
    if (sprintIndex < 0) return sprintId;
    const sprint = sprints[sprintIndex];
    const start = sprint.startDatetime ? new Date(sprint.startDatetime).toLocaleDateString() : '';
    const end = sprint.endDatetime ? new Date(sprint.endDatetime).toLocaleDateString() : '';
    return `Sprint ${sprintIndex + 1}${start ? ` (${start}${end ? ` – ${end}` : ''})` : ''}`;
  };

  const questionLabel = (evaluationType, questionId) => {
    const typeRubric = gradesOverview.rubricByType[evaluationType];
    const question = typeRubric?.questions?.find((q) => q.questionId === questionId);
    return question?.criteriaName ?? questionId;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-1">
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

      <Card>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Grades Overview
            </p>
            <p className="text-sm text-slate-400">
              Review graded submissions and rubric evaluations for the selected group.
            </p>
          </div>

          {!selectedGroup ? (
            <p className="text-sm text-slate-500">Select a group to see recorded grades.</p>
          ) : (
            <>
              {gradesOverview.loading && (
                <p className="text-sm text-slate-500">Loading grade overview…</p>
              )}
              {gradesOverview.error && (
                <p className="text-sm text-red-400">{gradesOverview.error}</p>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="space-y-3 rounded-xl border border-[#1e293b] bg-[#0f172a]/40 p-4">
                  <h3 className="text-sm font-semibold text-slate-200">Graded Submissions</h3>
                  {gradesOverview.gradedSubmissions.length === 0 ? (
                    <p className="text-sm text-slate-500">No submissions have jury grades yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {gradesOverview.gradedSubmissions.map((submission) => {
                        const grades = Array.isArray(submission.grades) ? submission.grades : [];
                        const average =
                          grades.length > 0
                            ? grades.reduce((sum, grade) => sum + Number(grade.gradeValue ?? 0), 0) / grades.length
                            : null;
                        return (
                          <div key={submission._id} className="rounded-lg border border-[#23304a] bg-[#0b1220] p-3">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-200">
                                {submission.title ?? submission.type ?? submission._id}
                              </span>
                              {submission.type && (
                                <span className="rounded border border-[#334155] px-2 py-0.5 text-[11px] text-slate-400">
                                  {submission.type}
                                </span>
                              )}
                              {average != null && (
                                <span className="ml-auto text-xs font-semibold text-emerald-400">
                                  Avg {average.toFixed(1)}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1">
                              {grades.map((grade) => (
                                <div
                                  key={grade.gradeId ?? `${grade.graderUserId}-${grade.gradedAt}`}
                                  className="flex items-center justify-between text-xs text-slate-400"
                                >
                                  <span className="font-mono">{grade.graderUserId}</span>
                                  <span className="font-semibold text-slate-200">{grade.gradeValue}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="space-y-3 rounded-xl border border-[#1e293b] bg-[#0f172a]/40 p-4">
                  <h3 className="text-sm font-semibold text-slate-200">Rubric Evaluations</h3>
                  {gradesOverview.rubricEvaluations.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No rubric evaluations recorded{selectedSprint ? ' for this sprint' : ''}.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {gradesOverview.rubricEvaluations.map((evaluation) => (
                        <div
                          key={evaluation.evaluationId}
                          className="rounded-lg border border-[#23304a] bg-[#0b1220] p-3"
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-200">
                              {evaluation.evaluationType === 'CODE_REVIEW' ? 'Code Review' : 'Scrum'}
                            </span>
                            <span className="rounded border border-[#334155] px-2 py-0.5 text-[11px] text-slate-400">
                              {sprintLabel(evaluation.sprintId)}
                            </span>
                            <span className="ml-auto text-xs font-semibold text-blue-300">
                              Avg {Number(evaluation.averageScore ?? 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {(evaluation.responses ?? []).map((response) => (
                              <div
                                key={response.questionId}
                                className="flex items-center justify-between gap-2 text-xs"
                              >
                                <span className="text-slate-400">
                                  {questionLabel(evaluation.evaluationType, response.questionId)}
                                </span>
                                <span className="rounded bg-blue-600 px-2 py-0.5 font-bold text-white">
                                  {response.softGrade}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default SprintEvaluationPage;
