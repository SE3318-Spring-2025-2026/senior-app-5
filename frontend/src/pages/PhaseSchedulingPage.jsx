import { useState } from 'react';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import styles from './PhaseSchedulingPage.module.css';

const toLocalInputValue = (date) => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

function PhaseSchedulingPage() {
  const [phaseId, setPhaseId] = useState('');
  const [submissionStart, setSubmissionStart] = useState(toLocalInputValue(new Date()));
  const [submissionEnd, setSubmissionEnd] = useState(toLocalInputValue(new Date(Date.now() + 86400000)));
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState({ loading: false, message: '', error: '' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, message: '', error: '' });
    setResult(null);

    try {
      const response = await apiClient.put(apiConfig.endpoints.phaseSchedule(phaseId), {
        submissionStart: new Date(submissionStart).toISOString(),
        submissionEnd: new Date(submissionEnd).toISOString(),
      });

      setResult(response.data);
      setStatus({
        loading: false,
        message: `Phase ${phaseId} schedule updated successfully.`,
        error: '',
      });
    } catch (error) {
      const details =
        error.response?.data?.message ||
        error.message ||
        'Failed to update phase schedule.';

      setStatus({ loading: false, message: '', error: details });
    }
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <p className={styles.badge}>Issue #78</p>
        <h1>Phase Scheduling Form</h1>
        <p className={styles.lead}>
          Configure submission window dates for a phase using the coordinator scheduling endpoint.
        </p>
      </header>

      <section className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            Phase ID
            <input
              type="text"
              value={phaseId}
              onChange={(e) => setPhaseId(e.target.value)}
              placeholder="Phase UUID"
              required
            />
          </label>

          <label>
            Submission Start
            <input
              type="datetime-local"
              value={submissionStart}
              onChange={(e) => setSubmissionStart(e.target.value)}
              required
            />
          </label>

          <label>
            Submission End
            <input
              type="datetime-local"
              value={submissionEnd}
              onChange={(e) => setSubmissionEnd(e.target.value)}
              required
            />
          </label>

          <button type="submit" disabled={status.loading}>
            {status.loading ? 'Updating…' : 'Update Phase Schedule'}
          </button>
        </form>

        {status.message && <div className={`${styles.status} ${styles.success}`}>{status.message}</div>}
        {status.error && <div className={`${styles.status} ${styles.error}`}>{status.error}</div>}

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
