import React from 'react';
import PhaseScheduleForm from '../components/PhaseScheduleForm';

const CoordinatorDashboard: React.FC = () => {
  
  
  const currentPhaseId = "phase-101"; 

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Coordinator Dashboard</h2>
      <p>Welcome to the phase management area. You can set the deadlines below.</p>
      
      <hr style={{ margin: '20px 0' }} />

      
      <PhaseScheduleForm phaseId={currentPhaseId} />
      
    </div>
  );
};

export default CoordinatorDashboard;