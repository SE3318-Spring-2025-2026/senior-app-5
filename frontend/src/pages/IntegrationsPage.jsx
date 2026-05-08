import { useEffect, useState } from 'react';
import authService from '../utils/authService';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import GithubConnect from '../components/GithubConnect';
import JiraConnect from '../components/JiraConnect';
import TeamIntegrationsForm from '../components/TeamIntegrationsForm';
import IntegrationStatusCard from '../components/IntegrationStatusCard';
import { PageHeader } from '../components/ui';

const IntegrationsPage = () => {
  const [userId, setUserId] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const [myTeam, setMyTeam] = useState(null);
  const [myTeamError, setMyTeamError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await authService.getCurrentUser();
        if (cancelled) return;
        setUserId(me?.id || me?._id || null);
      } catch (err) {
        if (cancelled) return;
        const msg = err?.response?.data?.message || err?.message || 'Failed to load user';
        setLoadError(msg);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const mineRes = await apiClient.get(apiConfig.endpoints.teamMine);
        if (cancelled) return;
        setMyTeam(mineRes.data ?? null);
      } catch (err) {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          setMyTeamError(
            'Only Team Leaders can configure team integrations. Create a team first.',
          );
        } else {
          setMyTeamError(err?.response?.data?.message || 'Failed to load your team.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  return (
    <div>
      <PageHeader
        title="Integrations"
        subtitle="Connect external services to your account."
      />

      {loadError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 mb-4">
          {loadError}
        </div>
      )}

      <div className="max-w-lg">
        {userId ? (
          <>
            <GithubConnect userId={userId} />
            <JiraConnect userId={userId} />

            <div style={{ marginTop: 24 }}>
              <h3 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 600 }}>
                Team Integrations
              </h3>
              <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
                Connect your team's JIRA & GitHub. You can only configure your own team.
              </p>

              {myTeamError && (
                <div style={{
                  marginTop: 12, padding: 10, borderRadius: 8,
                  background: '#450a0a', border: '1px solid #7f1d1d',
                  color: '#fca5a5', fontSize: 13,
                }}>
                  {myTeamError}
                </div>
              )}

              {myTeam ? (
                <>
                  <IntegrationStatusCard teamId={myTeam.teamId} />
                  <TeamIntegrationsForm team={myTeam} />
                </>
              ) : !myTeamError ? (
                <div style={{
                  marginTop: 12, color: '#94a3b8', fontSize: 13,
                }}>
                  Loading your team…
                </div>
              ) : null}
            </div>
          </>
        ) : (
          !loadError && (
            <div className="rounded-2xl border border-[#1e293b] bg-[#111827] px-5 py-8 text-center text-sm text-slate-500">
              Loading…
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default IntegrationsPage;
