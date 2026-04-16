import { useMemo, useRef, useState } from 'react';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import { getSubmissionWindowStatus, WINDOW_STATE } from '../utils/submissionWindow';
import styles from './StudentSubmissionPage.module.css';

const initialFeedback = { loading: false, message: '', error: '' };

function StudentSubmissionPage() {
  const fileInputRef = useRef(null);
  const [phaseId, setPhaseId] = useState('');
  const [submissionId, setSubmissionId] = useState('');
  const [file, setFile] = useState(null);
  const [phase, setPhase] = useState(null);
  const [windowStatus, setWindowStatus] = useState(() => getSubmissionWindowStatus(null, null));
  const [phaseFeedback, setPhaseFeedback] = useState(initialFeedback);
  const [submitFeedback, setSubmitFeedback] = useState(initialFeedback);

  const isSubmissionDisabled = useMemo(
    () => !windowStatus.isActive || submitFeedback.loading,
    [windowStatus.isActive, submitFeedback.loading],
  );

  const windowBannerClass = useMemo(() => {
    if (windowStatus.state === WINDOW_STATE.OPEN) {
      return styles.open;
    }

    if (windowStatus.state === WINDOW_STATE.UPCOMING) {
      return styles.upcoming;
    }

    if (windowStatus.state === WINDOW_STATE.CLOSED) {
      return styles.closed;
    }

    return styles.unavailable;
  }, [windowStatus.state]);

  const fetchPhaseWindow = async () => {
    if (!phaseId.trim()) {
      setPhaseFeedback({ loading: false, message: '', error: 'Phase ID is required to load the submission window.' });
      return null;
    }

    setPhaseFeedback({ loading: true, message: '', error: '' });

    try {
      const response = await apiClient.get(apiConfig.endpoints.phaseById(phaseId.trim()));
      const nextPhase = response.data;
      const nextWindowStatus = getSubmissionWindowStatus(nextPhase?.submissionStart, nextPhase?.submissionEnd);
      const phaseMessage =
        nextWindowStatus.state === WINDOW_STATE.UNAVAILABLE ? '' : 'Phase schedule loaded successfully.';

      setPhase(nextPhase);
      setWindowStatus(nextWindowStatus);
      setPhaseFeedback({ loading: false, message: phaseMessage, error: '' });
      return nextWindowStatus;
    } catch (error) {
      const details = error.response?.data?.message || error.message || 'Unable to load phase schedule.';
      setPhase(null);
      setWindowStatus(getSubmissionWindowStatus(null, null));
      setPhaseFeedback({ loading: false, message: '', error: Array.isArray(details) ? details.join(', ') : details });
      return null;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!submissionId.trim()) {
      setSubmitFeedback({ loading: false, message: '', error: 'Submission ID is required.' });
      return;
    }

    if (!file) {
      setSubmitFeedback({ loading: false, message: '', error: 'Please choose a file to upload.' });
      return;
    }

    setSubmitFeedback({ loading: true, message: '', error: '' });

    const latestWindowStatus = await fetchPhaseWindow();
    if (!latestWindowStatus?.isActive) {
      setSubmitFeedback({
        loading: false,
        message: '',
        error: latestWindowStatus?.message || 'Submission window is not active. Upload is blocked.',
      });
      return;
    }

    const payload = new FormData();
    payload.append('file', file);

    try {
      const response = await apiClient.post(
        apiConfig.endpoints.submissionDocuments(submissionId.trim()),
        payload,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      const uploadedName = response.data?.document?.originalName || file.name;
      setSubmitFeedback({ loading: false, message: `Uploaded ${uploadedName} successfully.`, error: '' });
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      const details = error.response?.data?.message || error.message || 'File upload failed.';
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setFile(null);
      setSubmitFeedback({ loading: false, message: '', error: Array.isArray(details) ? details.join(', ') : details });
    }
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.hero}>
        <h1>Submission Window Enforcement</h1>
        <p>
          Load a phase schedule and submit documents only when the submission window is open.
        </p>
      </header>

      <section className={styles.card}>
        <h2>1. Load Phase Window</h2>
        <div className={styles.formRow}>
          <label htmlFor="phaseId">Phase ID</label>
          <input
            id="phaseId"
            value={phaseId}
            onChange={(event) => setPhaseId(event.target.value)}
            placeholder="Enter phase UUID"
          />
        </div>
        <button type="button" onClick={fetchPhaseWindow} disabled={phaseFeedback.loading} className={styles.primaryButton}>
          {phaseFeedback.loading ? 'Loading window...' : 'Load Window Status'}
        </button>

        {phaseFeedback.message && <p className={styles.successText}>{phaseFeedback.message}</p>}
        {phaseFeedback.error && <p className={styles.errorText}>{phaseFeedback.error}</p>}

        <div
          className={`${styles.windowBanner} ${windowBannerClass}`}
        >
          <strong>Submission Window Status: {windowStatus.state}</strong>
          <span>{windowStatus.message}</span>
        </div>

        {phase && (
          <div className={styles.windowDetails}>
            <p>
              <strong>submissionStart:</strong> {phase.submissionStart || 'Not set'}
            </p>
            <p>
              <strong>submissionEnd:</strong> {phase.submissionEnd || 'Not set'}
            </p>
          </div>
        )}
      </section>

      <section className={styles.card}>
        <h2>2. Upload Submission Document</h2>
        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <div className={styles.formRow}>
            <label htmlFor="submissionId">Submission ID</label>
            <input
              id="submissionId"
              value={submissionId}
              onChange={(event) => setSubmissionId(event.target.value)}
              placeholder="Enter submission ID"
              disabled={isSubmissionDisabled}
            />
          </div>

          <div className={styles.formRow}>
            <label htmlFor="submissionFile">Document</label>
            <input
              id="submissionFile"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              disabled={isSubmissionDisabled}
            />
          </div>

          <button type="submit" className={styles.primaryButton} disabled={isSubmissionDisabled}>
            {submitFeedback.loading ? 'Uploading...' : 'Submit Document'}
          </button>
        </form>

        {isSubmissionDisabled && (
          <p className={styles.infoText}>
            Submission controls are disabled because the current window state is {windowStatus.state}.
          </p>
        )}

        {submitFeedback.message && <p className={styles.successText}>{submitFeedback.message}</p>}
        {submitFeedback.error && <p className={styles.errorText}>{submitFeedback.error}</p>}
      </section>
    </div>
  );
}

export default StudentSubmissionPage;