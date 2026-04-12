import React, { useState } from 'react';
import { updatePhaseSchedule } from '../services/phaseService';

interface PhaseScheduleFormProps {
  phaseId: string;
}

const PhaseScheduleForm: React.FC<PhaseScheduleFormProps> = ({ phaseId }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success' | '', text: string }>({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage({ type: '', text: '' }); 

    
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      setStatusMessage({ 
        type: 'error', 
        text: 'End date must be after the start date.' 
      });
      return;
    }

    setIsSubmitting(true);

    try {
      
      const isoStartDate = start.toISOString();
      const isoEndDate = end.toISOString();

      
      await updatePhaseSchedule(phaseId, isoStartDate, isoEndDate);
      
      
      setStatusMessage({ 
        type: 'success', 
        text: 'Phase schedule updated successfully! 🎉' 
      });
    } catch (error) {
      
      setStatusMessage({ 
        type: 'error', 
        text: 'Failed to update schedule. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h4>Schedule Phase</h4>
      
      {/* Status Message Display */}
      {statusMessage.text && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '15px', 
          borderRadius: '4px',
          backgroundColor: statusMessage.type === 'error' ? '#ffe6e6' : '#e6ffe6',
          color: statusMessage.type === 'error' ? '#cc0000' : '#006600'
        }}>
          {statusMessage.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="startDate" style={{ display: 'block', marginBottom: '5px' }}>Start Date:</label>
          <input
            type="datetime-local"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="endDate" style={{ display: 'block', marginBottom: '5px' }}>End Date:</label>
          <input
            type="datetime-local"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
        >
          {isSubmitting ? 'Saving...' : 'Save Schedule'}
        </button>
      </form>
    </div>
  );
};

export default PhaseScheduleForm;