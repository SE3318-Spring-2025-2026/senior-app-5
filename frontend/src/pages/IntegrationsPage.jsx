import { useEffect, useState } from 'react';
import authService from '../utils/authService';
import GithubConnect from '../components/GithubConnect';
import { PageHeader } from '../components/ui';

const IntegrationsPage = () => {
  const [userId, setUserId] = useState(null);
  const [loadError, setLoadError] = useState(null);

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
          <GithubConnect userId={userId} />
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
