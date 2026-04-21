import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import styles from './DocumentsPage.module.css';

const SubmissionDetailsPage = () => {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  const [submission, setSubmission] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: '' });

  useEffect(() => {
    const fetchSubmissionDetails = async () => {
      try {
        
        const response = await apiClient.get(`/submissions/${id}`);
        setSubmission(response.data);
        setStatus({ loading: false, error: '' });
      } catch (error) {
        console.error("Fetch error:", error);
        setStatus({ loading: false, error: 'Failed to load submission details.' });
      }
    };

    fetchSubmissionDetails();
  }, [id]);

  if (status.loading) {
    return <div className={styles.pageContainer}><div className={styles.loading}>Loading details...</div></div>;
  }

  if (status.error) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.errorBox}>{status.error}</div>
        <button onClick={() => navigate(-1)} className={styles.smallButton}>&larr; Go Back</button>
      </div>
    );
  }

  if (!submission) return null;

  return (
    <div className={styles.pageContainer}>
      <button 
        onClick={() => navigate('/documents')} 
        className={styles.secondaryButton} 
        style={{ marginBottom: '20px', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
      >
        &larr; Back to List
      </button>

      <div className={styles.headerSection}>
        <h1 className={styles.title}>SUBMISSION DETAILS</h1>
        <p className={styles.description}>Viewing details for: {submission.title}</p>
      </div>

      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr 1fr' }}>
  
        <div className={styles.infoBox} style={{ textAlign: 'left' }}>
          <h3 style={{ color: '#f8fafc', marginBottom: '15px' }}>General Information</h3>
          <p><strong>Type:</strong> {submission.type}</p>
          <p><strong>Status:</strong> <span className={`${styles.badge} ${styles[submission.status?.toLowerCase().replace(/\s+/g, '')] || ''}`}>{submission.status}</span></p>
          <p><strong>Group ID:</strong> {submission.groupId}</p>
          <p><strong>Submitted On:</strong> {new Date(submission.submittedAt || submission.createdAt).toLocaleString()}</p>
        </div>

        <div className={styles.infoBox} style={{ textAlign: 'left' }}>
          <h3 style={{ color: '#f8fafc', marginBottom: '15px' }}>Attached Documents</h3>
          
          {!submission.documents || submission.documents.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No files have been uploaded yet.</p>
          ) : (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {submission.documents.map((doc, index) => (
                <li key={index} style={{ padding: '10px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between' }}>
                  <span>📄 {doc.originalName}</span>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionDetailsPage;