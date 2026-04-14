import { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import './ActivityPage.css'; // We'll create this

function ActivityPage() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchActivityLogs();
  }, []);

  useEffect(() => {
    // Filter logs based on search term
    const filtered = logs.filter(log =>
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredLogs(filtered);
  }, [logs, searchTerm]);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(apiConfig.endpoints.activityLogs);
      setLogs(response.data);
      setFilteredLogs(response.data);
    } catch (err) {
      setError('Failed to fetch activity logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="activity-page">
      <h1>Activity Logs</h1>
      <div className="search-container">
        <input
          type="text"
          placeholder="Search by user or action..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>
      <table className="activity-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>User</th>
            <th>Action Type</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.map((log, index) => (
            <tr key={index}>
              <td>{formatTimestamp(log.timestamp)}</td>
              <td>{log.user}</td>
              <td>{log.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ActivityPage;