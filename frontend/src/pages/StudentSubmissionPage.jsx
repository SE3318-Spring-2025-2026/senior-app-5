import { useMemo, useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import { getSubmissionWindowStatus, WINDOW_STATE } from '../utils/submissionWindow';
import { PageHeader } from '../components/ui';

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
    const base = 'rounded-lg border px-4 py-3 mt-3 text-sm font-medium';
    if (windowStatus.state === WINDOW_STATE.OPEN) {
      return `${base} border-green-500/30 bg-green-500/10 text-green-400`;
    }
    if (windowStatus.state === WINDOW_STATE.UPCOMING) {
      return `${base} border-yellow-500/30 bg-yellow-500/10 text-yellow-400`;
    }
    if (windowStatus.state === WINDOW_STATE.CLOSED) {
      return `${base} border-red-500/30 bg-red-500/10 text-red-400`;
    }
    return `${base} border-slate-500/30 bg-slate-500/10 text-slate-400`;
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
    <div>
      <PageHeader
        title="Document Submission"
        subtitle="Upload documents within the active submission window."
      />

      {/* Section 1: Load Phase Window */}
      <section className="bg-[#111827] rounded-2xl border border-[#1e293b] p-5 mb-4">
        <h2 className="text-sm font-bold text-slate-200 mb-4">1. Load Phase Window</h2>

        {!urlPhaseId && (
          <>
            <div className="flex flex-col gap-1.5 mb-4">
              <label htmlFor="phaseId" className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Phase ID
              </label>
              <input
                id="phaseId"
                value={phaseId}
                onChange={(event) => setPhaseId(event.target.value)}
                placeholder="Enter phase UUID"
                className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              type="button"
              onClick={fetchPhaseWindow}
              disabled={phaseFeedback.loading}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {phaseFeedback.loading ? 'Loading window...' : 'Load Window Status'}
            </button>
          </>
        )}

        {urlPhaseId && (
          <p className="text-sm text-slate-500 mt-2">
            Phase loaded from URL: <strong className="text-slate-300">{urlPhaseId}</strong>
          </p>
        )}

        {phaseFeedback.message && (
          <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400 mt-3">
            {phaseFeedback.message}
          </p>
        )}
        {phaseFeedback.error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 mt-3">
            {phaseFeedback.error}
          </p>
        )}

        <div className={windowBannerClass}>
          <strong>Submission Window Status: {windowStatus.state}</strong>
          <span className="block mt-0.5">{windowStatus.message}</span>
        </div>

        {phase && (
          <div className="text-sm text-slate-400 mt-2 space-y-1">
            <p>
              <strong className="text-slate-300">submissionStart:</strong> {phase.submissionStart || 'Not set'}
            </p>
            <p>
              <strong className="text-slate-300">submissionEnd:</strong> {phase.submissionEnd || 'Not set'}
            </p>
          </div>
        )}
      </section>

      {/* Section 2: Upload Submission Document */}
      <section className="bg-[#111827] rounded-2xl border border-[#1e293b] p-5">
        <h2 className="text-sm font-bold text-slate-200 mb-4">2. Upload Submission Document</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="submissionId" className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              Submission ID
            </label>
            <input
              id="submissionId"
              value={submissionId}
              onChange={(event) => setSubmissionId(event.target.value)}
              placeholder="Enter submission ID"
              disabled={isSubmissionDisabled}
              className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {urlSubmissionId && (
              <p className="text-sm text-slate-500 mt-2">Submission ID provided via URL</p>
            )}
          </div>

          <div>
            <label htmlFor="submissionFile" className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              Document
            </label>
            <input
              id="submissionFile"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              disabled={isSubmissionDisabled}
              className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmissionDisabled}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitFeedback.loading ? 'Uploading...' : 'Submit Document'}
            </button>
          </div>
        </form>

        {isSubmissionDisabled && (
          <p className="text-sm text-slate-500 mt-2">
            Submission controls are disabled because the current window state is {windowStatus.state}.
          </p>
        )}

        {submitFeedback.message && (
          <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400 mt-3">
            {submitFeedback.message}
          </p>
        )}
        {submitFeedback.error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 mt-3">
            {submitFeedback.error}
          </p>
        )}
      </section>
    </div>
  );
}

export default StudentSubmissionPage;
