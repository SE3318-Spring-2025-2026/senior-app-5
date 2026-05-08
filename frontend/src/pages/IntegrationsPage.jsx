import { useEffect, useState } from 'react';
import { Link2, AlertCircle, Loader2, Lock, ShieldCheck, Kanban } from 'lucide-react';
import authService from '../utils/authService';
import GithubConnect from '../components/GithubConnect';
import { PageHeader } from '../components/ui';

function IntegrationCard({ icon: Icon, name, description, comingSoon }) {
  return (
    <div className="relative flex items-start gap-3.5 overflow-hidden rounded-2xl border border-[#1f1f23] bg-[#131316] p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#26262b] bg-[#0a0a0b] text-zinc-300">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-semibold tracking-tight text-zinc-100">{name}</h3>
          {comingSoon && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#26262b] bg-[#18181c] px-2 py-0.5 text-[10px] font-medium text-zinc-500">
              <Lock size={9} /> Soon
            </span>
          )}
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

const IntegrationsPage = () => {
  const [userId, setUserId] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);

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
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="Integrations"
        subtitle="Connect external services to sync data into your workspace."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Active integrations — main column */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Available
            </h2>
            <span className="text-[11px] text-zinc-700">1 active</span>
          </div>

          {loadError && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-900/40 bg-rose-950/20 p-3.5 text-[13px] text-rose-300">
              <AlertCircle size={14} className="mt-px shrink-0" />
              <span>{loadError}</span>
            </div>
          )}

          {loading ? (
            <div className="flex h-44 items-center justify-center gap-2 rounded-2xl border border-[#1f1f23] bg-[#131316] text-[13px] text-zinc-500">
              <Loader2 size={14} className="animate-spin" /> Loading account…
            </div>
          ) : userId ? (
            <GithubConnect userId={userId} />
          ) : (
            !loadError && (
              <div className="flex h-44 items-center justify-center rounded-2xl border border-[#1f1f23] bg-[#131316] text-[13px] text-zinc-500">
                Sign in required
              </div>
            )
          )}

          {/* Roadmap */}
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Coming soon
              </h2>
              <span className="text-[11px] text-zinc-700">Planned</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <IntegrationCard
                icon={Kanban}
                name="Jira"
                description="Pull sprint progress and story points directly from Jira boards."
                comingSoon
              />
              <IntegrationCard
                icon={ShieldCheck}
                name="Single Sign-On"
                description="University SSO via SAML or institutional identity providers."
                comingSoon
              />
            </div>
          </div>
        </div>

        {/* Help / context — side column */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-[#1f1f23] bg-[#131316] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              About integrations
            </p>
            <h3 className="mt-2 text-[15px] font-semibold tracking-tight text-zinc-100">
              Why connect external services?
            </h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-500">
              Integrations let your project work in tools like GitHub stay in sync with the academic
              workspace. Story points, sprint progress, and contributions flow automatically — without
              manual reporting.
            </p>
          </div>

          <div className="rounded-2xl border border-[#1f1f23] bg-[#0e0e10] p-5">
            <div className="flex items-start gap-2.5">
              <Lock size={14} className="mt-0.5 shrink-0 text-zinc-500" />
              <div>
                <p className="text-[12.5px] font-medium text-zinc-300">Your data is private</p>
                <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
                  We only request the minimum scopes needed. You can disconnect at any time and we'll
                  drop the access token immediately.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#1f1f23] bg-[#0e0e10] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Quick links
            </p>
            <div className="mt-3 space-y-2">
              <a
                href="https://docs.github.com/en/apps/oauth-apps"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-[12.5px] text-zinc-400 transition hover:text-zinc-100"
              >
                <Link2 size={12} /> GitHub OAuth docs ↗
              </a>
              <a
                href="#"
                className="flex items-center gap-2 text-[12.5px] text-zinc-400 transition hover:text-zinc-100"
              >
                <ShieldCheck size={12} /> Permission policy ↗
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default IntegrationsPage;
