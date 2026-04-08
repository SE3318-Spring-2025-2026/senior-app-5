import React, { useState } from 'react';



const TEAM_ID = 'your_mongo_id_here'; 

export const IntegrationSettings: React.FC = () => {
  const [jiraProjectKey, setJiraProjectKey] = useState('');
  const [githubRepositoryId, setGithubRepositoryId] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage(null);

    try {
      // Sending PUT request to the backend endpoint we just created
      const response = await fetch(`http://localhost:3001/teams/${TEAM_ID}/integrations`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jiraProjectKey,
          githubRepositoryId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong while verifying integrations.');
      }

      setStatusMessage({ type: 'success', text: 'Integrations successfully verified and saved!' });
    } catch (error: any) {
      setStatusMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-md border border-gray-200 font-sans">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Team Integrations</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Jira Input */}
        <div className="flex flex-col">
          <label htmlFor="jiraKey" className="text-sm font-medium text-gray-700 mb-1">
            Jira Project Key
          </label>
          <input
            type="text"
            id="jiraKey"
            value={jiraProjectKey}
            onChange={(e) => setJiraProjectKey(e.target.value)}
            placeholder="e.g. SENIOR-1"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            required
          />
        </div>

        {/* GitHub Input */}
        <div className="flex flex-col">
          <label htmlFor="githubRepo" className="text-sm font-medium text-gray-700 mb-1">
            GitHub Repository ID
          </label>
          <input
            type="text"
            id="githubRepo"
            value={githubRepositoryId}
            onChange={(e) => setGithubRepositoryId(e.target.value)}
            placeholder="e.g. facebook/react"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            required
          />
        </div>

        {/* Status Messages */}
        {/* Status Messages */}
        {statusMessage && (
          <div className={`p-3 rounded-lg text-sm transition-all ${
            statusMessage.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {statusMessage.text}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2 px-4 rounded-lg text-white font-medium transition-colors ${
            isLoading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Verifying...' : 'Save Integrations'}
        </button>
      </form>
    </div>
  );
};