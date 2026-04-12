import React, { useEffect, useState } from 'react';
import { getSowValidationStatus } from '../services/groupService';


type DocumentStatus = 'APPROVED' | 'PENDING' | 'REVISED' | 'NOT_SUBMITTED';

interface DocumentStatusBannerProps {
  groupId: string;
}

const DocumentStatusBanner: React.FC<DocumentStatusBannerProps> = ({ groupId }) => {
  
  const [sowStatus, setSowStatus] = useState<DocumentStatus>('NOT_SUBMITTED');
  const [proposalStatus, setProposalStatus] = useState<DocumentStatus>('NOT_SUBMITTED');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        setIsLoading(true);
        
        const data = await getSowValidationStatus(groupId);
        
        
        
        if (data) {
          setSowStatus(data.sowStatus || 'NOT_SUBMITTED');
          setProposalStatus(data.proposalStatus || 'NOT_SUBMITTED');
        }
      } catch (error) {
        console.error('Belge durumları çekilemedi.', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatuses();
  }, [groupId]);

  
  const getStatusDisplay = (status: DocumentStatus) => {
    switch (status) {
      case 'APPROVED':
        return { text: 'Approved', color: '#155724', bgColor: '#d4edda', border: '#c3e6cb' }; // Yeşil
      case 'PENDING':
        return { text: 'Pending Review', color: '#856404', bgColor: '#fff3cd', border: '#ffeeba' }; // Sarı
      case 'REVISED':
        return { text: 'Needs Revision', color: '#721c24', bgColor: '#f8d7da', border: '#f5c6cb' }; // Kırmızı
      case 'NOT_SUBMITTED':
      default:
        return { text: 'Not Submitted', color: '#383d41', bgColor: '#e2e3e5', border: '#d6d8db' }; // Gri (Empty State)
    }
  };

  if (isLoading) {
    return <div>Loading document statuses...</div>;
  }

  const sowDisplay = getStatusDisplay(sowStatus);
  const proposalDisplay = getStatusDisplay(proposalStatus);

  return (
    <div style={{ padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', maxWidth: '500px', backgroundColor: '#fdfdfd' }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>📋 Document Validation Status</h3>
      
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <span style={{ fontWeight: 'bold' }}>Statement of Work:</span>
        <span style={{
          padding: '5px 12px',
          borderRadius: '15px',
          fontSize: '14px',
          fontWeight: 'bold',
          color: sowDisplay.color,
          backgroundColor: sowDisplay.bgColor,
          border: `1px solid ${sowDisplay.border}`
        }}>
          {sowDisplay.text}
        </span>
      </div>

      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold' }}>Revised Proposal:</span>
        <span style={{
          padding: '5px 12px',
          borderRadius: '15px',
          fontSize: '14px',
          fontWeight: 'bold',
          color: proposalDisplay.color,
          backgroundColor: proposalDisplay.bgColor,
          border: `1px solid ${proposalDisplay.border}`
        }}>
          {proposalDisplay.text}
        </span>
      </div>
    </div>
  );
};

export default DocumentStatusBanner;