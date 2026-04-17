import { useEffect, useState } from 'react';
import SubmissionFileUpload from '../components/submissions/SubmissionFileUpload';
import { getMySubmissions } from '../utils/submissionService';

export default function StudentSubmissionPage() {
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('');
  const [latestDocument, setLatestDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const loadSubmissions = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const data = await getMySubmissions();
        setSubmissions(Array.isArray(data) ? data : []);
      } catch {
        setLoadError('Could not load your submissions.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSubmissions();
  }, []);

  return (
    <div>
      <h1>Student Submission</h1>

      {isLoading && <p>Loading your submissions...</p>}
      {loadError && <p style={{ color: 'crimson' }}>{loadError}</p>}

      {!isLoading && !loadError && (
        <>
          <label htmlFor="submissionId">Your Submissions</label>
          <select
            id="submissionId"
            value={selectedSubmissionId}
            onChange={(e) => setSelectedSubmissionId(e.target.value)}
          >
            <option value="">Select a submission</option>
            {submissions.map((submission) => (
              <option key={submission._id} value={submission._id}>
                {submission.title || submission._id}
              </option>
            ))}
          </select>

          {selectedSubmissionId ? (
            <SubmissionFileUpload
              submissionId={selectedSubmissionId}
              onUploadSuccess={(doc) => setLatestDocument(doc)}
            />
          ) : (
            <p>Please select one of your submissions first.</p>
          )}
        </>
      )}

      {latestDocument && (
        <div>
          <h3>Attached Document</h3>
          <p>Name: {latestDocument.originalName}</p>
          <p>Type: {latestDocument.mimeType}</p>
          <p>Uploaded: {new Date(latestDocument.uploadedAt).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}