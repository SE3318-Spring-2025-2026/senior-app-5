import { useEffect, useMemo, useState } from 'react';
import authService from '../utils/authService';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import GithubConnect from '../components/GithubConnect';
import JiraConnect from '../components/JiraConnect';
import TeamIntegrationsForm from '../components/TeamIntegrationsForm';
import { PageHeader } from '../components/ui';

const IntegrationsPage = () => {
  const [userId, setUserId] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
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
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const [teamsRes, groupsRes, mineRes] = await Promise.all([
          apiClient.get(apiConfig.endpoints.teamsList).catch(() => ({ data: [] })),
          apiClient.get(apiConfig.endpoints.groups, { params: { page: 1, limit: 100 } })
            .catch(() => ({ data: { data: [] } })),
          apiClient.get(apiConfig.endpoints.teamMine).catch((err) => {
            if (err?.response?.status === 403 || err?.response?.status === 401) return null;
            return null;
          }),
        ]);
        if (cancelled) return;

        const myTeam = mineRes?.data ?? null;
        const baseTeams = teamsRes.data ?? [];
        const merged = myTeam
          ? [myTeam, ...baseTeams.filter((t) => t.teamId !== myTeam.teamId)]
          : baseTeams;
        setTeams(merged);
        setGroups(groupsRes.data?.data ?? groupsRes.data ?? []);
        if (myTeam) setSelectedTeamId(myTeam.teamId);
      } catch (err) {
        if (!cancelled) {
          setTeams([]);
          setGroups([]);
          setMyTeamError(err?.response?.data?.message || 'Failed to load team data.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const myTeams = useMemo(() => {
    if (!userId) return [];
    return teams.filter((t) => t.leaderId === userId);
  }, [teams, userId]);

  const visibleTeams = myTeams.length > 0 ? myTeams : teams;

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
                Team Integrations {myTeams.length > 0 ? '(your teams)' : '(all teams)'}
              </h3>
              <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
                Configure your team's JIRA & GitHub credentials. Your team is selected automatically.
              </p>
              {myTeamError && (
                <div style={{ marginTop: 8, color: '#fca5a5', fontSize: 13 }}>{myTeamError}</div>
              )}

              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8, marginTop: 8,
                  background: '#0b1220', border: '1px solid #1e293b', color: '#f8fafc',
                  fontSize: 14,
                }}
              >
                <option value="">— Select a team —</option>
                {visibleTeams.map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.name}
                  </option>
                ))}
              </select>

              {selectedTeamId && (
                <TeamIntegrationsForm teamId={selectedTeamId} groups={groups} />
              )}
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
