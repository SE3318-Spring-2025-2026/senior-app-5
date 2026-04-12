import React from 'react';
import DocumentStatusBanner from '../components/DocumentStatusBanner';

const StudentDashboard: React.FC = () => {
  
  const currentGroupId = "group-42"; 

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
      <h2>🎓 Student Dashboard</h2>
      <p>Welcome back! Here you can track your project deliverables and their current validation statuses.</p>
      
      <hr style={{ margin: '20px 0', borderColor: '#eee' }} />

      
      <DocumentStatusBanner groupId={currentGroupId} />
      
    </div>
  );
};

export default StudentDashboard;