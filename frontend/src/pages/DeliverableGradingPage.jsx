import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { ChevronDown, ChevronRight, BookOpen, Package } from 'lucide-react';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import { PageHeader } from '../components/ui';

const SOFT_GRADES = ['A', 'B', 'C', 'D', 'F'];
const BINARY_GRADES = ['S', 'F'];

// Binary S (Satisfactory) → A, F → F  (backend only accepts A/B/C/D/F)
const binaryToSoft = (g) => (g === 'S' ? 'A' : 'F');

const inputCls =
  'w-full rounded-md border border-[#26262b] bg-[#0a0a0b] px-3.5 py-2.5 text-[13px] text-zinc-200 transition-colors focus:border-[#3a3a40] focus:outline-none focus:ring-1 focus:ring-[#3a3a40]';

function GradeButton({ label, active, onClick, color }) {
  const colorMap = {
    blue: active
      ? 'bg-blue-600 text-white border-blue-600'
      : 'border-[#26262b] bg-[#0a0a0b] text-zinc-400 hover:border-[#3a3a40] hover:text-zinc-200',
    green: active
      ? 'bg-emerald-600 text-white border-emerald-600'
      : 'border-[#26262b] bg-[#0a0a0b] text-zinc-400 hover:border-[#3a3a40] hover:text-zinc-200',
    rose: active
      ? 'bg-rose-600 text-white border-rose-600'
      : 'border-[#26262b] bg-[#0a0a0b] text-zinc-400 hover:border-[#3a3a40] hover:text-zinc-200',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 w-12 rounded-md border text-[13px] font-bold transition-colors ${colorMap[color] ?? colorMap.blue}`}
    >
      {label}
    </button>
  );
}

// Weighted grade calculation helpers
const GRADE_VALUES = { A: 100, B: 80, C: 60, D: 50, F: 0, S: 100 };
const scoreToLetter = (score) => {
  if (score >= 90) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 25) return 'D';
  return 'F';
};

function DeliverableCard({ deliverable, groupId, currentUserId }) {
  const [open, setOpen] = useState(false);
  const [rubrics, setRubrics] = useState(null); // null = not loaded yet
  const [loadingRubrics, setLoadingRubrics] = useState(false);
  const [criteriaGrades, setCriteriaGrades] = useState({}); // { [questionId]: grade }
  const [submitting, setSubmitting] = useState(false);
  const [existingEvals, setExistingEvals] = useState([]);

  const loadRubrics = useCallback(async () => {
    if (rubrics !== null) return;
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
  }, [deliverable.deliverableId, rubrics]);

  // Pull every committee member's existing grade for this (group, deliverable)
  // pair so the professor can see what others have submitted before grading.
  const loadExistingEvals = useCallback(async () => {
    try {
      const res = await apiClient.get(apiConfig.endpoints.deliverableEvaluations, {
        params: { groupId, deliverableId: deliverable.deliverableId, limit: 100 },
      });
      const data = res.data?.data ?? res.data ?? [];
      setExistingEvals(Array.isArray(data) ? data : []);
    } catch {
      setExistingEvals([]);
    }
  }, [deliverable.deliverableId, groupId]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      loadRubrics();
      loadExistingEvals();
    }
  };

  // Use the active rubric; fall back to first rubric
  const activeRubric = rubrics?.find((r) => r.isActive) ?? rubrics?.[0] ?? null;
  const gradingType = activeRubric?.gradingType ?? 'soft';
  const gradeOptions = gradingType === 'binary' ? BINARY_GRADES : SOFT_GRADES;
  const questions = activeRubric?.questions ?? [];

  const gradeColorFor = (g) => {
    if (gradingType === 'binary') return g === 'S' ? 'green' : 'rose';
    if (g === 'A') return 'green';
    if (g === 'F') return 'rose';
    return 'blue';
  };

  const allGraded =
    questions.length > 0 && questions.every((q) => criteriaGrades[q.questionId]);

  const calculatedGrade = allGraded
    ? scoreToLetter(
        questions.reduce(
          (sum, q) =>
            sum + (GRADE_VALUES[criteriaGrades[q.questionId]] ?? 0) * q.criteriaWeight,
          0,
        ),
      )
    : null;

  const handleSubmit = async () => {
    if (!allGraded) { toast.error('Please grade all criteria.'); return; }
    if (!groupId) { toast.error('No group selected.'); return; }
    setSubmitting(true);
    try {
      await apiClient.post('/deliverable-evaluations', {
        groupId,
        deliverableId: deliverable.deliverableId,
        deliverableGrade: calculatedGrade,
      });
      // Auto-trigger grade calculation so student final grades are updated immediately
      try {
        await apiClient.post(`/groups/${groupId}/calculate`, { force: true });
      } catch {
        // Calculation errors are non-fatal; grade was still recorded
      }
      toast.success(
        `Grade "${calculatedGrade}" submitted for ${deliverable.name ?? 'deliverable'}.`,
      );
      setCriteriaGrades({});
      loadExistingEvals();
    } catch (err) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to submit grade.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#1f1f23] bg-[#131316]">
      {/* Deliverable header row */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown size={14} className="text-zinc-500" />
          ) : (
            <ChevronRight size={14} className="text-zinc-600" />
          )}
          <span className="text-[14px] font-semibold text-zinc-200">
            {deliverable.name ?? deliverable.deliverableId}
          </span>
          {deliverable.percentage != null && (
            <span className="rounded-md border border-[#26262b] bg-[#18181c] px-2 py-0.5 text-[11px] text-zinc-400">
              {deliverable.percentage}%
            </span>
          )}
        </div>
        {open && gradingType && rubrics?.length > 0 && (
          <span className="rounded-md border border-[#26262b] bg-[#18181c] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            {gradingType}
          </span>
        )}
      </button>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-[#1f1f23] px-5 py-4 space-y-4">
          {/* Existing committee grades for this deliverable */}
          {existingEvals.length > 0 && (
            <div className="rounded-lg border border-[#1f1f23] bg-[#0a0a0b] p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Committee grades so far ({existingEvals.length})
              </p>
              <ul className="space-y-1.5">
                {existingEvals.map((e) => {
                  const isMe = e.gradedBy === currentUserId;
                  const who = e.gradedByName || e.gradedByEmail || (isMe ? 'You' : 'Unknown');
                  return (
                    <li
                      key={e.evaluationId}
                      className="flex items-center justify-between text-[12px]"
                    >
                      <span className={isMe ? 'text-emerald-400 font-semibold' : 'text-zinc-300'}>
                        {who}{isMe ? ' (you)' : ''}
                      </span>
                      <span
                        className={`rounded border px-2 py-0.5 font-bold ${
                          e.deliverableGrade === 'A'
                            ? 'border-emerald-700 text-emerald-400'
                            : e.deliverableGrade === 'F'
                            ? 'border-rose-700 text-rose-400'
                            : 'border-blue-700 text-blue-400'
                        }`}
                      >
                        {e.deliverableGrade}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-[10px] text-zinc-600">
                Final per-deliverable raw grade is the average of all committee members.
              </p>
            </div>
          )}

          {loadingRubrics ? (
            <p className="text-[13px] text-zinc-600">Loading rubrics…</p>
          ) : rubrics?.length === 0 ? (
            <p className="text-[13px] text-zinc-600">
              No rubrics defined for this deliverable.
            </p>
          ) : (
            <>
              {/* Non-active rubrics shown for reference */}
              {rubrics.filter((r) => r.rubricId !== activeRubric?.rubricId).length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    <BookOpen size={11} className="mr-1.5 inline" />
                    Other Rubrics (reference)
                  </p>
                  {rubrics
                    .filter((r) => r.rubricId !== activeRubric?.rubricId)
                    .map((r) => (
                      <div
                        key={r.rubricId}
                        className="rounded-lg border border-[#1f1f23] bg-[#0a0a0b] p-3 opacity-50"
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-semibold text-zinc-200">{r.name}</span>
                          <span className="rounded border border-[#26262b] px-1.5 py-px text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                            {r.gradingType}
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {(r.questions ?? []).map((q) => (
                            <li key={q.questionId} className="flex items-center justify-between">
                              <span className="text-[12px] text-zinc-400">{q.criteriaName}</span>
                              <span className="text-[12px] font-semibold tabular-nums text-zinc-300">
                                {(q.criteriaWeight * 100).toFixed(0)}%
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                </div>
              )}

              {/* Active rubric with per-criteria grading */}
              {activeRubric && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    <BookOpen size={11} className="mr-1.5 inline" />
                    Grade by Criteria
                    <span className="ml-2 normal-case tracking-normal font-normal text-zinc-600">
                      — {activeRubric.name}
                    </span>
                  </p>
                  <div className="rounded-lg border border-[#2a2a30] bg-[#0e0e10] p-3 space-y-4">
                    {/* Rubric header */}
                    <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-[#1f1f23]">
                      <span className="text-[13px] font-semibold text-zinc-200">
                        {activeRubric.name}
                      </span>
                      <span className="rounded border border-[#26262b] px-1.5 py-px text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                        {activeRubric.gradingType}
                      </span>
                      <span className="rounded border border-emerald-800/60 bg-emerald-900/30 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                        active
                      </span>
                    </div>

                    {/* Per-criteria grade rows */}
                    <ul className="space-y-4">
                      {questions.map((q) => (
                        <li key={q.questionId} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-medium text-zinc-200">
                              {q.criteriaName}
                            </span>
                            <span className="text-[12px] font-semibold tabular-nums text-zinc-400">
                              {(q.criteriaWeight * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {gradeOptions.map((g) => (
                              <GradeButton
                                key={g}
                                label={g}
                                active={criteriaGrades[q.questionId] === g}
                                onClick={() =>
                                  setCriteriaGrades((prev) => ({
                                    ...prev,
                                    [q.questionId]: g,
                                  }))
                                }
                                color={gradeColorFor(g)}
                              />
                            ))}
                            {gradingType === 'binary' && (
                              <span className="text-[11px] text-zinc-600">
                                S = Satisfactory · F = Fail
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>

                    {/* Calculated grade preview + submit */}
                    <div className="border-t border-[#1f1f23] pt-3 flex items-center gap-4">
                      {calculatedGrade ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-zinc-500">Calculated grade:</span>
                          <span
                            className={`text-[20px] font-bold ${
                              calculatedGrade === 'A'
                                ? 'text-emerald-400'
                                : calculatedGrade === 'F'
                                ? 'text-rose-400'
                                : 'text-blue-400'
                            }`}
                          >
                            {calculatedGrade}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[12px] text-zinc-600">
                          Grade all {questions.length} criteria to see result
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={submitting || !allGraded}
                        onClick={handleSubmit}
                        className="ml-auto rounded-md bg-zinc-100 px-4 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#26262b] disabled:text-zinc-600"
                      >
                        {submitting ? 'Submitting…' : 'Submit Grade'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const DeliverableGradingPage = () => {
  const [groups, setGroups] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const currentUserId = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') ?? 'null');
      return u?.id ?? u?._id ?? u?.userId ?? null;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    const load = async () => {
      // Lists every group the caller can grade deliverables for — both
      // groups they advise directly and groups they jury via committee
      // membership. Sprint evaluations remain advisor-only and are gated
      // server-side, not here.
      const [groupsRes, delRes] = await Promise.allSettled([
        apiClient.get(apiConfig.endpoints.myGradableGroups),
        apiClient.get(apiConfig.endpoints.deliverables, { params: { limit: 100 } }),
      ]);
      if (groupsRes.status === 'fulfilled') {
        const data = groupsRes.value.data?.data ?? [];
        setGroups(Array.isArray(data) ? data : []);
      }
      if (delRes.status === 'fulfilled') {
        const data = delRes.value.data?.data ?? delRes.value.data ?? [];
        setDeliverables(Array.isArray(data) ? data : []);
      }
    };
    load();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        eyebrow="Professor"
        title="Deliverable Grading"
        subtitle="Select a group, then grade each deliverable using its rubric criteria."
      />

      {/* Group selector */}
      <section className="rounded-2xl border border-[#1f1f23] bg-[#131316] p-5">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          <Package size={11} className="mr-1.5 inline" />
          Group
        </p>
        <select
          className={inputCls}
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
        >
          <option value="">Select a group…</option>
          {groups.map((g) => {
            const label = g.groupName ?? g.name ?? g.groupId;
            const tag = g.role === 'jury'
              ? ' [jury]'
              : g.isOwnGroup
              ? ' [own group]'
              : g.role === 'advisor'
              ? ' [committee advisor]'
              : '';
            return (
              <option key={`${g.groupId}-${g.committeeId ?? ''}`} value={g.groupId}>
                {label}{tag}
              </option>
            );
          })}
        </select>
      </section>

      {/* Deliverables list */}
      {selectedGroup ? (
        <section className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Deliverables — click to expand and grade
          </p>
          {deliverables.length === 0 ? (
            <p className="text-[13px] text-zinc-600">No deliverables found.</p>
          ) : (
            deliverables.map((d) => (
              <DeliverableCard
                key={d.deliverableId}
                deliverable={d}
                groupId={selectedGroup}
                currentUserId={currentUserId}
              />
            ))
          )}
        </section>
      ) : (
        <p className="text-center text-[13px] text-zinc-600">
          ← Select a group to start grading
        </p>
      )}
    </div>
  );
};

export default DeliverableGradingPage;
