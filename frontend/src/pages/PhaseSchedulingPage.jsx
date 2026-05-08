import { useEffect, useMemo, useState } from 'react';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import { PageHeader } from '../components/ui';

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

const formatErrorMessages = (message) => {
  if (Array.isArray(message)) return message;
  if (typeof message === 'string' && message.trim()) return [message];
  return ['Failed to update phase schedule.'];
};

function PhaseSchedulingPage() {
  const [phases, setPhases] = useState([]);
  const [phaseId, setPhaseId] = useState('');
  const [submissionStart, setSubmissionStart] = useState('');
  const [submissionEnd, setSubmissionEnd] = useState('');
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState({ loading: false, loadingPhases: true, message: '', errors: [] });
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
        title="Phase Scheduling"
        subtitle={`Date fields use ${timezoneName}; saved as UTC.`}
      />

      <div className="bg-[#111827] rounded-2xl border border-[#1e293b] p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Phase Select */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              Phase
            </label>
            <select
              value={phaseId}
              onChange={handlePhaseChange}
              disabled={status.loadingPhases || status.loading}
              aria-invalid={Boolean(fieldErrors.phaseId)}
              className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {status.loadingPhases ? 'Loading phases...' : 'Select a phase'}
              </option>
              {phases.map((phase) => (
                <option key={phase.phaseId} value={phase.phaseId}>
                  {phase.phaseId}
                </option>
              ))}
            </select>
            {fieldErrors.phaseId && (
              <p className="text-xs text-red-400 mt-1">{fieldErrors.phaseId}</p>
            )}
          </div>

          {/* Current Schedule Preview */}
          {selectedPhase && (
            <div className="rounded-xl border border-[#1e293b] bg-[#080f1f] p-4 mt-3 mb-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                Current Schedule
              </p>
              <dl className="space-y-3">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    Submission Start
                  </dt>
                  <dd className="text-sm text-slate-200 mt-0.5">
                    {formatDisplayDate(selectedPhase.submissionStart)}
                  </dd>
                  <dd className="text-xs text-slate-600 font-mono mt-0.5">
                    <span className="sr-only">UTC time: </span>
                    {formatUtcDate(selectedPhase.submissionStart)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    Submission End
                  </dt>
                  <dd className="text-sm text-slate-200 mt-0.5">
                    {formatDisplayDate(selectedPhase.submissionEnd)}
                  </dd>
                  <dd className="text-xs text-slate-600 font-mono mt-0.5">
                    <span className="sr-only">UTC time: </span>
                    {formatUtcDate(selectedPhase.submissionEnd)}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* Submission Start */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              Submission Start
            </label>
            <input
              type="datetime-local"
              value={submissionStart}
              disabled={!phaseId || status.loading}
              onChange={(event) => {
                setSubmissionStart(event.target.value);
                setFieldErrors((current) => ({ ...current, submissionStart: '' }));
              }}
              aria-invalid={Boolean(fieldErrors.submissionStart)}
              className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {fieldErrors.submissionStart && (
              <p className="text-xs text-red-400 mt-1">{fieldErrors.submissionStart}</p>
            )}
          </div>

          {/* Submission End */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              Submission End
            </label>
            <input
              type="datetime-local"
              value={submissionEnd}
              min={submissionStart}
              disabled={!phaseId || status.loading}
              onChange={(event) => {
                setSubmissionEnd(event.target.value);
                setFieldErrors((current) => ({ ...current, submissionEnd: '' }));
              }}
              aria-invalid={Boolean(fieldErrors.submissionEnd)}
              className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {fieldErrors.submissionEnd && (
              <p className="text-xs text-red-400 mt-1">{fieldErrors.submissionEnd}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-2">
            <button
              type="submit"
              disabled={status.loading || !phaseId}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status.loading ? 'Updating...' : 'Update Phase Schedule'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={!phaseId || status.loading}
              className="rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm font-bold text-slate-300 hover:border-slate-600 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
          </div>
        </form>

        {/* Status messages */}
        {status.message && (
          <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400 mt-3">
            {status.message}
          </p>
        )}
        {status.errors.length > 0 && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 mt-3">
            {status.errors.length === 1 ? (
              status.errors[0]
            ) : (
              <ul className="list-disc list-inside space-y-1">
                {status.errors.map((errorMessage) => (
                  <li key={errorMessage}>{errorMessage}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Result box */}
        {result && (
          <div className="rounded-xl border border-[#1e293b] bg-[#080f1f] p-4 mt-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">
              Schedule Changes
            </p>
            <dl className="space-y-3">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Previous Start
                </dt>
                <dd className="text-sm text-slate-200 mt-0.5">
                  {formatDisplayDate(result.previous.submissionStart)}
                </dd>
                <dd className="text-xs text-slate-600 font-mono mt-0.5">
                  <span className="sr-only">UTC time: </span>
                  {formatUtcDate(result.previous.submissionStart)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Updated Start
                </dt>
                <dd className="text-sm text-slate-200 mt-0.5">
                  {formatDisplayDate(result.updated.submissionStart)}
                </dd>
                <dd className="text-xs text-slate-600 font-mono mt-0.5">
                  <span className="sr-only">UTC time: </span>
                  {formatUtcDate(result.updated.submissionStart)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Previous End
                </dt>
                <dd className="text-sm text-slate-200 mt-0.5">
                  {formatDisplayDate(result.previous.submissionEnd)}
                </dd>
                <dd className="text-xs text-slate-600 font-mono mt-0.5">
                  <span className="sr-only">UTC time: </span>
                  {formatUtcDate(result.previous.submissionEnd)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Updated End
                </dt>
                <dd className="text-sm text-slate-200 mt-0.5">
                  {formatDisplayDate(result.updated.submissionEnd)}
                </dd>
                <dd className="text-xs text-slate-600 font-mono mt-0.5">
                  <span className="sr-only">UTC time: </span>
                  {formatUtcDate(result.updated.submissionEnd)}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

export default PhaseSchedulingPage;
