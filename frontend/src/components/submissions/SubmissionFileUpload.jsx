import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { uploadSubmissionDocument } from '../../utils/submissionService';

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function getExtension(filename = '') {
  return filename.split('.').pop()?.toLowerCase() || '';
}

function getFriendlyError(error) {
  const message = error?.response?.data?.message;

  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  if (error?.response?.status === 413) return 'File too large. Maximum size is 5MB.';
  return 'Upload failed. Please try again.';
}

export default function SubmissionFileUpload({ submissionId, onUploadSuccess }) {
  const inputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const validateFile = (file) => {
    if (!file) return 'Please select a file.';
    const ext = getExtension(file.name);

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported format. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File too large. Maximum size is 5MB.';
    }
    return null;
  };

  const handleFileChosen = (file) => {
    setSuccessMessage('');
    setErrorMessage('');
    const validationError = validateFile(file);

    if (validationError) {
      setSelectedFile(null);
      setErrorMessage(validationError);
      return;
    }
    setSelectedFile(file);
  };

  const handleInputChange = (e) => {
    handleFileChosen(e.target.files?.[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChosen(e.dataTransfer.files?.[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setProgress(0);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const result = await uploadSubmissionDocument(submissionId, selectedFile, setProgress);
      setSuccessMessage('Document attached successfully.');
      onUploadSuccess?.(result?.document || null);
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (error) {
      setErrorMessage(getFriendlyError(error));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#3b82f6' : '#9ca3af'}`,
          borderRadius: 8,
          padding: 20,
          cursor: 'pointer',
          marginBottom: 12,
        }}
      >
        <p style={{ margin: 0 }}>
          Drag & drop file here, or click to select
        </p>
        <small>Allowed: PDF, DOC, DOCX, PNG, JPG, JPEG (max 5MB)</small>
      </div>

      <input
        ref={inputRef}
        type="file"
        onChange={handleInputChange}
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        style={{ display: 'none' }}
      />

      {selectedFile && (
        <p>
          Selected: <strong>{selectedFile.name}</strong> ({Math.round(selectedFile.size / 1024)} KB)
        </p>
      )}

      <button type="button" onClick={handleUpload} disabled={!selectedFile || isUploading}>
        {isUploading ? 'Uploading...' : 'Upload Document'}
      </button>

      {isUploading && (
        <div style={{ marginTop: 10 }}>
          <progress value={progress} max="100" style={{ width: '100%' }} />
          <div>{progress}%</div>
        </div>
      )}

      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
      {errorMessage && <p style={{ color: 'crimson' }}>{errorMessage}</p>}
    </div>
  );
}

SubmissionFileUpload.propTypes = {
  submissionId: PropTypes.string.isRequired,
  onUploadSuccess: PropTypes.func,
};