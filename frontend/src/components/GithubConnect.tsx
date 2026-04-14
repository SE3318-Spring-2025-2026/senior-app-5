import React, { useState, useEffect } from 'react';

interface GithubConnectProps {
  userId: string;
  initialIsLinked?: boolean;
}

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const GithubConnect: React.FC<GithubConnectProps> = ({ userId, initialIsLinked = false }) => {
  const [isLinked, setIsLinked] = useState<boolean>(initialIsLinked);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('access_token'); 

    if (tokenFromUrl && !isLinked) {
      sendTokenToBackend(tokenFromUrl);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isLinked]);

  const sendTokenToBackend = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const userJwtToken = localStorage.getItem('accessToken'); 

      const response = await fetch(`${BACKEND_URL}/users/${userId}/integrations/github`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userJwtToken}`,
        },
        body: JSON.stringify({ oauthAccessToken: token }),
      });

      if (!response.ok) {
        throw new Error('Failed to link GitHub account. Please try again.');
      }

      setIsLinked(true);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectClick = () => {
    if (!GITHUB_CLIENT_ID) {
      setError('GitHub Client ID is missing. Check your .env file.');
      return;
    }

    const redirectUri = encodeURIComponent(window.location.href);
    const githubOAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=read:user`;
    
    window.location.href = githubOAuthUrl;
  };

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">OAuth Integrations</h3>
      
      {error && (
        <div className="p-3 mb-4 text-sm text-red-800 bg-red-100 border border-red-200 rounded-lg">
          {error}
        </div>
      )}
      
      <button 
        onClick={handleConnectClick} 
        disabled={isLinked || loading}
        type="button"
        className={`w-full py-2 px-4 rounded-lg text-white font-medium transition-colors flex justify-center items-center gap-2 ${
          isLinked ? 'bg-green-600 cursor-default' : 'bg-gray-900 hover:bg-gray-800'
        } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {loading ? 'Connecting...' : (isLinked ? '✓ GitHub Account Linked' : 'Connect GitHub Account')}
      </button>
    </div>
  );
};

export default GithubConnect;