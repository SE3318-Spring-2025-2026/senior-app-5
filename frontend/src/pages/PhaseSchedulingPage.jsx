import { useEffect, useMemo, useState } from 'react';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import styles from './PhaseSchedulingPage.module.css';

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

    setStatus({ loading: true, loadingPhases: false, message: '', errors: [] });

    try {
      const response = await apiClient.put(apiConfig.endpoints.phaseSchedule(phaseId), {
        submissionStart: startDate.toISOString(),
        submissionEnd: endDate.toISOString(),
      });

      setResult(response.data);
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
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <p className={styles.badge}>Coordinator Tools</p>
        <h1>Phase Scheduling</h1>
        <p className={styles.lead}>
          Select a phase, review its current submission window, and update the schedule.
        </p>
      </header>

      <section className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            Phase
            <select
              value={phaseId}
              onChange={handlePhaseChange}
              disabled={status.loadingPhases}
              aria-invalid={Boolean(fieldErrors.phaseId)}
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
            {fieldErrors.phaseId && <span className={styles.fieldError}>{fieldErrors.phaseId}</span>}
          </label>

          {selectedPhase && (
            <div className={styles.previewBox}>
              <strong>Current Schedule</strong>
              <dl>
                <div>
                  <dt>Submission Start</dt>
                  <dd>{formatDisplayDate(selectedPhase.submissionStart)}</dd>
                </div>
                <div>
                  <dt>Submission End</dt>
                  <dd>{formatDisplayDate(selectedPhase.submissionEnd)}</dd>
                </div>
              </dl>
            </div>
          )}

          <label>
            Submission Start
            <input
              type="datetime-local"
              value={submissionStart}
              onChange={(event) => {
                setSubmissionStart(event.target.value);
                setFieldErrors((current) => ({ ...current, submissionStart: '' }));
              }}
              aria-invalid={Boolean(fieldErrors.submissionStart)}
            />
            {fieldErrors.submissionStart && (
              <span className={styles.fieldError}>{fieldErrors.submissionStart}</span>
            )}
          </label>

          <label>
            Submission End
            <input
              type="datetime-local"
              value={submissionEnd}
              min={submissionStart}
              onChange={(event) => {
                setSubmissionEnd(event.target.value);
                setFieldErrors((current) => ({ ...current, submissionEnd: '' }));
              }}
              aria-invalid={Boolean(fieldErrors.submissionEnd)}
            />
            {fieldErrors.submissionEnd && (
              <span className={styles.fieldError}>{fieldErrors.submissionEnd}</span>
            )}
          </label>

          <div className={styles.actions}>
            <button type="submit" disabled={status.loading || !phaseId}>
              {status.loading ? 'Updating...' : 'Update Phase Schedule'}
            </button>
            <button type="button" onClick={handleReset} disabled={!phaseId || status.loading} className={styles.secondaryButton}>
              Reset
            </button>
          </div>
        </form>

        {status.message && <div className={`${styles.status} ${styles.success}`}>{status.message}</div>}
        {status.errors.length > 0 && (
          <div className={`${styles.status} ${styles.error}`}>
            {status.errors.length === 1 ? (
              status.errors[0]
            ) : (
              <ul className={styles.errorList}>
                {status.errors.map((errorMessage) => (
                  <li key={errorMessage}>{errorMessage}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {result && (
          <div className={styles.resultBox}>
            <strong>Updated Phase</strong>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </section>
    </div>
  );
}

export default PhaseSchedulingPage;
