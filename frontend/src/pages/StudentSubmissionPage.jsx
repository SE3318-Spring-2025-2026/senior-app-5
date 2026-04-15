import { useState } from 'react';
import SubmissionFileUpload from '../components/submissions/SubmissionFileUpload';

export default function StudentSubmissionPage() {
  const [submissionId, setSubmissionId] = useState('');
  const [latestDocument, setLatestDocument] = useState(null);

  return (
    <div>
      <h1>Student Submission</h1>

      <label htmlFor="submissionId">Submission ID</label>
      <input
        id="submissionId"
        value={submissionId}
        onChange={(e) => setSubmissionId(e.target.value)}
        placeholder="Enter submission ID"
      />

      {submissionId ? (
        <SubmissionFileUpload
          submissionId={submissionId}
          onUploadSuccess={(doc) => setLatestDocument(doc)}
        />
      ) : (
        <p>Please enter a submission ID first.</p>
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