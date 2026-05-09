import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import { PageHeader } from '../components/ui';
import { openNativeDatePicker } from '../utils/openPicker';

const toLocalInputValue = (date) => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

const toInputValue = (value) => {
  if (!value) return '';

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : toLocalInputValue(date);
};

const formatDisplayDate = (value) => {
  if (!value) return 'Not scheduled';

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleString();
};

const formatUtcDate = (value) => {
  if (!value) return 'No UTC value stored';

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Invalid UTC value' : date.toISOString();
};

const formatErrorMessages = (message, defaultMessage = 'Failed to update phase schedule.') => {
  if (Array.isArray(message)) return message;
  if (typeof message === 'string' && message.trim()) return [message];
  return [defaultMessage];
};

const getPhaseOptionLabel = (phase) => phase.name || phase.phaseId;

/* ─── design helpers ────────────────────────────────────────────── */
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

function FieldLabel({ children, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
    >
      {children}
    </label>
  );
}

const inputCls =
  'w-full rounded-md border border-[#26262b] bg-[#0a0a0b] px-3.5 py-2.5 text-[13px] text-zinc-200 transition-colors focus:border-[#3a3a40] focus:outline-none focus:ring-1 focus:ring-[#3a3a40] disabled:opacity-50 disabled:cursor-not-allowed';

function PhaseSchedulingPage() {
  const [phases, setPhases] = useState([]);
  const [phaseId, setPhaseId] = useState('');
  const [phaseName, setPhaseName] = useState('');
  const [submissionStart, setSubmissionStart] = useState('');
  const [submissionEnd, setSubmissionEnd] = useState('');
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState({ loading: false, loadingPhases: true, message: '', errors: [] });
  const [creatingPhase, setCreatingPhase] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const selectedPhase = useMemo(
    () => phases.find((phase) => phase.phaseId === phaseId) || null,
    [phaseId, phases],
  );
  const timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';

  useEffect(() => {
    const fetchPhases = async () => {
      setStatus({ loading: false, loadingPhases: true, message: '', errors: [] });

      try {
        const response = await apiClient.get(apiConfig.endpoints.phases);
        setPhases(response.data || []);
        setStatus({ loading: false, loadingPhases: false, message: '', errors: [] });
      } catch (error) {
        const details = error.response?.data?.message || error.message;
        setStatus({
          loading: false,
          loadingPhases: false,
          message: '',
          errors: formatErrorMessages(details || 'Failed to load phases.'),
        });
      }
    };

    fetchPhases();
  }, []);

  const parseDateTime = (value) => new Date(value);

  const applyPhaseSchedule = (phase) => {
    setSubmissionStart(toInputValue(phase?.submissionStart));
    setSubmissionEnd(toInputValue(phase?.submissionEnd));
    setResult(null);
    setFieldErrors({});
    setStatus((current) => ({ ...current, message: '', errors: [] }));
  };

  const handlePhaseChange = (event) => {
    const nextPhaseId = event.target.value;
    const nextPhase = phases.find((phase) => phase.phaseId === nextPhaseId);

    setPhaseId(nextPhaseId);
    applyPhaseSchedule(nextPhase);
  };

  const handleCreatePhase = async (event) => {
    event.preventDefault();

    const trimmedName = phaseName.trim();
    if (!trimmedName) {
      setFieldErrors((current) => ({ ...current, phaseName: 'Phase name is required.' }));
      setStatus((current) => ({ ...current, message: '', errors: [] }));
      return;
    }

    setCreatingPhase(true);
    setResult(null);
    setFieldErrors((current) => ({ ...current, phaseName: '' }));
    setStatus({ loading: false, loadingPhases: false, message: '', errors: [] });

    try {
      const response = await apiClient.post(apiConfig.endpoints.phasesCreate, {
        name: trimmedName,
      });
      const createdPhase = response.data;

      setPhases((currentPhases) => {
        const withoutDuplicate = currentPhases.filter(
          (phase) => phase.phaseId !== createdPhase.phaseId,
        );
        return [...withoutDuplicate, createdPhase].sort((a, b) =>
          (a.name || a.phaseId || '').localeCompare(b.name || b.phaseId || '')
        );
      });
      setPhaseId(createdPhase.phaseId);
      setSubmissionStart(toInputValue(createdPhase.submissionStart));
      setSubmissionEnd(toInputValue(createdPhase.submissionEnd));
      setPhaseName('');
      setFieldErrors({});
      setStatus({
        loading: false,
        loadingPhases: false,
        message: `Phase ${createdPhase.name || createdPhase.phaseId} created successfully.`,
        errors: [],
      });
    } catch (error) {
      const details =
        error.response?.data?.message ||
        error.message ||
        'Failed to create phase.';

      setStatus({
        loading: false,
        loadingPhases: false,
        message: '',
        errors: formatErrorMessages(details, 'Failed to create phase.'),
      });
    } finally {
      setCreatingPhase(false);
    }
  };

  const validateForm = () => {
    const nextFieldErrors = {};

    if (!phaseId) {
      nextFieldErrors.phaseId = 'Please select a phase.';
    }

    if (!submissionStart) {
      nextFieldErrors.submissionStart = 'Submission start is required.';
    }

    if (!submissionEnd) {
      nextFieldErrors.submissionEnd = 'Submission end is required.';
    }

    const startDate = parseDateTime(submissionStart);
    const endDate = parseDateTime(submissionEnd);

    if (submissionStart && Number.isNaN(startDate.getTime())) {
      nextFieldErrors.submissionStart = 'Please enter a valid submission start date.';
    }

    if (submissionEnd && Number.isNaN(endDate.getTime())) {
      nextFieldErrors.submissionEnd = 'Please enter a valid submission end date.';
    }

    if (
      !Number.isNaN(startDate.getTime()) &&
      !Number.isNaN(endDate.getTime()) &&
      endDate <= startDate
    ) {
      nextFieldErrors.submissionEnd =
        'Submission end date must be strictly after the submission start date.';
    }

    setFieldErrors(nextFieldErrors);
    return Object.keys(nextFieldErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setResult(null);

    if (!validateForm()) {
      setStatus((current) => ({ ...current, message: '', errors: [] }));
      return;
    }

    const startDate = parseDateTime(submissionStart);
    const endDate = parseDateTime(submissionEnd);
    const previousSchedule = {
      submissionStart: selectedPhase?.submissionStart,
      submissionEnd: selectedPhase?.submissionEnd,
    };

    setStatus({ loading: true, loadingPhases: false, message: '', errors: [] });

    try {
      const response = await apiClient.put(apiConfig.endpoints.phaseSchedule(phaseId), {
        submissionStart: startDate.toISOString(),
        submissionEnd: endDate.toISOString(),
      });

      setResult({
        phaseId,
        previous: previousSchedule,
        updated: {
          submissionStart: response.data.submissionStart,
          submissionEnd: response.data.submissionEnd,
        },
      });
      setPhases((currentPhases) =>
        currentPhases.map((phase) =>
          phase.phaseId === phaseId
            ? {
                ...phase,
                submissionStart: response.data.submissionStart,
                submissionEnd: response.data.submissionEnd,
              }
            : phase,
        ),
      );
      setStatus({
        loading: false,
        loadingPhases: false,
        message: `Phase ${phaseId} schedule updated successfully.`,
        errors: [],
      });
    } catch (error) {
      const details =
        error.response?.data?.message ||
        error.message ||
        'Failed to update phase schedule.';

      setStatus({ loading: false, loadingPhases: false, message: '', errors: formatErrorMessages(details) });
    }
  };

  const handleReset = () => {
    applyPhaseSchedule(selectedPhase);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Coordinator"
        title="Phase Scheduling"
        subtitle={`Date fields use ${timezoneName}; saved as UTC.`}
      />

      <div className="grid gap-4 max-w-[760px]">
        {/* Create phase */}
        <section className="rounded-2xl border border-[#1f1f23] bg-[#131316] p-5">
          <SectionLabel icon={Plus}>Create phase</SectionLabel>

          <form onSubmit={handleCreatePhase} className="flex flex-col gap-4">
            <div>
              <FieldLabel htmlFor="phaseName">Phase name</FieldLabel>
              <input
                id="phaseName"
                type="text"
                value={phaseName}
                disabled={creatingPhase}
                onChange={(event) => {
                  setPhaseName(event.target.value);
                  setFieldErrors((current) => ({ ...current, phaseName: '' }));
                }}
                aria-invalid={Boolean(fieldErrors.phaseName)}
                placeholder="e.g. Final Submission"
                className={inputCls}
              />
              {fieldErrors.phaseName && (
                <p className="mt-1 text-[12px] text-rose-400">{fieldErrors.phaseName}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={creatingPhase}
                className="rounded-md bg-zinc-100 px-4 py-2.5 text-[13px] font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#26262b] disabled:text-zinc-600"
              >
                {creatingPhase ? 'Creating…' : 'Create phase'}
              </button>
            </div>
          </form>
        </section>

        {/* Schedule */}
        <section className="rounded-2xl border border-[#1f1f23] bg-[#131316] p-5">
          <SectionLabel icon={CalendarDays}>Phase schedule</SectionLabel>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <FieldLabel htmlFor="phaseId">Phase</FieldLabel>
              <select
                id="phaseId"
                value={phaseId}
                onChange={handlePhaseChange}
                disabled={status.loadingPhases || status.loading}
                aria-invalid={Boolean(fieldErrors.phaseId)}
                className={inputCls}
              >
                <option value="">
                  {status.loadingPhases ? 'Loading phases…' : 'Select a phase'}
                </option>
                {phases.map((phase) => (
                  <option key={phase.phaseId} value={phase.phaseId}>
                    {getPhaseOptionLabel(phase)}
                  </option>
                ))}
              </select>
              {fieldErrors.phaseId && (
                <p className="mt-1 text-[12px] text-rose-400">{fieldErrors.phaseId}</p>
              )}
            </div>

            {selectedPhase && (
              <div className="rounded-xl border border-[#1f1f23] bg-[#0e0e10] p-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                  Current schedule
                </p>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                      Submission start
                    </dt>
                    <dd className="mt-0.5 text-[13px] text-zinc-200">
                      {formatDisplayDate(selectedPhase.submissionStart)}
                    </dd>
                    <dd className="mt-0.5 font-mono text-[11px] text-zinc-700">
                      <span className="sr-only">UTC time: </span>
                      {formatUtcDate(selectedPhase.submissionStart)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                      Submission end
                    </dt>
                    <dd className="mt-0.5 text-[13px] text-zinc-200">
                      {formatDisplayDate(selectedPhase.submissionEnd)}
                    </dd>
                    <dd className="mt-0.5 font-mono text-[11px] text-zinc-700">
                      <span className="sr-only">UTC time: </span>
                      {formatUtcDate(selectedPhase.submissionEnd)}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            <div>
              <FieldLabel htmlFor="submissionStart">Submission start</FieldLabel>
              <input
                id="submissionStart"
                type="datetime-local"
                value={submissionStart}
                disabled={!phaseId || status.loading}
                onClick={openNativeDatePicker}
                onChange={(event) => {
                  setSubmissionStart(event.target.value);
                  setFieldErrors((current) => ({ ...current, submissionStart: '' }));
                }}
                aria-invalid={Boolean(fieldErrors.submissionStart)}
                className={inputCls}
              />
              {fieldErrors.submissionStart && (
                <p className="mt-1 text-[12px] text-rose-400">{fieldErrors.submissionStart}</p>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="submissionEnd">Submission end</FieldLabel>
              <input
                id="submissionEnd"
                type="datetime-local"
                value={submissionEnd}
                min={submissionStart}
                disabled={!phaseId || status.loading}
                onClick={openNativeDatePicker}
                onChange={(event) => {
                  setSubmissionEnd(event.target.value);
                  setFieldErrors((current) => ({ ...current, submissionEnd: '' }));
                }}
                aria-invalid={Boolean(fieldErrors.submissionEnd)}
                className={inputCls}
              />
              {fieldErrors.submissionEnd && (
                <p className="mt-1 text-[12px] text-rose-400">{fieldErrors.submissionEnd}</p>
              )}
            </div>

            <div className="mt-2 flex gap-2">
              <button
                type="submit"
                disabled={status.loading || !phaseId}
                className="rounded-md bg-zinc-100 px-4 py-2.5 text-[13px] font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#26262b] disabled:text-zinc-600"
              >
                {status.loading ? 'Updating…' : 'Update Phase Schedule'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={!phaseId || status.loading}
                className="rounded-md border border-[#26262b] bg-[#18181c] px-4 py-2.5 text-[13px] font-medium text-zinc-300 transition-colors hover:border-[#3a3a40] hover:bg-[#1f1f23] hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset
              </button>
            </div>
          </form>

          {status.message && (
            <p className="mt-3 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2.5 text-[13px] text-emerald-300">
              {status.message}
            </p>
          )}
          {status.errors.length > 0 && (
            <div className="mt-3 rounded-md border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-[13px] text-rose-300">
              {status.errors.length === 1 ? (
                status.errors[0]
              ) : (
                <ul className="list-inside list-disc space-y-1">
                  {status.errors.map((errorMessage) => (
                    <li key={errorMessage}>{errorMessage}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {result && (
            <div className="mt-4 rounded-xl border border-[#1f1f23] bg-[#0e0e10] p-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                Schedule changes
              </p>
              <dl className="space-y-3">
                {[
                  { label: 'Previous start', value: result.previous.submissionStart },
                  { label: 'Updated start',  value: result.updated.submissionStart },
                  { label: 'Previous end',   value: result.previous.submissionEnd },
                  { label: 'Updated end',    value: result.updated.submissionEnd },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">{label}</dt>
                    <dd className="mt-0.5 text-[13px] text-zinc-200">{formatDisplayDate(value)}</dd>
                    <dd className="mt-0.5 font-mono text-[11px] text-zinc-700">
                      <span className="sr-only">UTC time: </span>
                      {formatUtcDate(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default PhaseSchedulingPage;
