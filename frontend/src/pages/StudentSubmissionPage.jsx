import { useMemo, useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import { getSubmissionWindowStatus, WINDOW_STATE } from '../utils/submissionWindow';
import styles from './StudentSubmissionPage.module.css';

const initialFeedback = { loading: false, message: '', error: '' };

function StudentSubmissionPage() {
  const { phaseId: urlPhaseId, submissionId: urlSubmissionId } = useParams();
  const fileInputRef = useRef(null);
  const [phaseId, setPhaseId] = useState(urlPhaseId || '');
  const [submissionId, setSubmissionId] = useState(urlSubmissionId || '');
  const [file, setFile] = useState(null);
  const [phase, setPhase] = useState(null);
  const [windowStatus, setWindowStatus] = useState(() => getSubmissionWindowStatus(null, null));
  const [phaseFeedback, setPhaseFeedback] = useState(initialFeedback);
  const [submitFeedback, setSubmitFeedback] = useState(initialFeedback);

  // Auto-load phase window when URL params are provided
  useEffect(() => {
    if (urlPhaseId) {
      const loadWindow = async () => {
        setPhaseFeedback({ loading: true, message: '', error: '' });
        try {
          const response = await apiClient.get(apiConfig.endpoints.phaseById(urlPhaseId.trim()));
          const nextPhase = response.data;
          const nextWindowStatus = getSubmissionWindowStatus(nextPhase?.submissionStart, nextPhase?.submissionEnd);
          const phaseMessage =
            nextWindowStatus.state === WINDOW_STATE.UNAVAILABLE ? '' : 'Phase schedule loaded successfully.';

          setPhase(nextPhase);
          setWindowStatus(nextWindowStatus);
          setPhaseFeedback({ loading: false, message: phaseMessage, error: '' });
        } catch (error) {
          const details = error.response?.data?.message || error.message || 'Unable to load phase schedule.';
          setPhase(null);
          setWindowStatus(getSubmissionWindowStatus(null, null));
          setPhaseFeedback({ loading: false, message: '', error: Array.isArray(details) ? details.join(', ') : details });
        }
      };
      loadWindow();
    } else {
      // No phaseId in URL - show unavailable state
      setWindowStatus({
        state: WINDOW_STATE.UNAVAILABLE,
        message: 'Invalid Phase ID. Please navigate to this page using a valid link.',
        isActive: false,
      });
    }
  }, [urlPhaseId]);

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
    const trimmedPhaseId = phaseId.trim();
    
    if (!trimmedPhaseId) {
      setPhaseFeedback({
        loading: false,
        message: '',
        error: 'Please enter a valid Phase ID first.',
      });
      return null;
    }

    setPhaseFeedback({ loading: true, message: '', error: '' });

    try {
      const response = await apiClient.get(apiConfig.endpoints.phaseById(trimmedPhaseId));
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

    const trimmedSubmissionId = submissionId.trim();
    if (!trimmedSubmissionId) {
      setSubmitFeedback({ loading: false, message: '', error: 'Submission ID is required to upload a document.' });
      return;
    }

    if (!file) {
      setSubmitFeedback({ loading: false, message: '', error: 'Please choose a file to upload.' });
      return;
    }

    setSubmitFeedback({ loading: true, message: '', error: '' });

    const latestWindowStatus = await fetchPhaseWindow();
    
    if (!latestWindowStatus) {
      setSubmitFeedback({
        loading: false,
        message: '',
        error: !phaseId || !phaseId.trim() ? 'Please enter a valid Phase ID first.' : 'Failed to fetch phase status. Upload is blocked.',
      });
      return;
    }

    if (!latestWindowStatus.isActive) {
      setSubmitFeedback({
        loading: false,
        message: '',
        error: latestWindowStatus.message || 'Submission window is not active. Upload is blocked.',
      });
      return;
    }

    const payload = new FormData();
    payload.append('file', file);

    try {
      const response = await apiClient.post(
        apiConfig.endpoints.submissionDocuments(trimmedSubmissionId),
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
        {!urlPhaseId && (
          <>
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
          </>
        )}
        {urlPhaseId && (
          <p className={styles.infoText}>Phase loaded from URL: <strong>{urlPhaseId}</strong></p>
        )}

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
            {urlSubmissionId && (
              <p className={styles.infoText}>Submission ID provided via URL</p>
            )}
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