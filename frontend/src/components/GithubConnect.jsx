import { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Link2, CheckCircle2, AlertCircle, Loader2, Unlink, Link as LinkIcon } from 'lucide-react';
import authService from '../utils/authService';

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
const GITHUB_OAUTH_SCOPES =
  import.meta.env.VITE_GITHUB_OAUTH_SCOPES || 'read:user read:project repo';
const STATE_STORAGE_KEY = 'github_oauth_state';

function generateState() {
  const random = crypto.getRandomValues(new Uint32Array(2));
  return `${Date.now()}-${random[0]}-${random[1]}`;
}

const GithubConnect = ({ userId }) => {
  const [isLinked, setIsLinked] = useState(false);
  const [scopes, setScopes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const refreshStatus = useCallback(async () => {
    if (!userId) return;
    try {
      const status = await authService.getGithubStatus(userId);
      setIsLinked(!!status.isGithubConnected);
      setScopes(status.scopes || null);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load GitHub status';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  useEffect(() => {
    if (!userId) return;
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');
    const oauthError = url.searchParams.get('error');

    if (oauthError) {
      setError(`GitHub authorization failed: ${oauthError}`);
      window.history.replaceState({}, document.title, url.pathname);
      return;
    }
    if (!code) return;

    const expectedState = sessionStorage.getItem(STATE_STORAGE_KEY);
    sessionStorage.removeItem(STATE_STORAGE_KEY);
    window.history.replaceState({}, document.title, url.pathname);

    if (!expectedState || expectedState !== returnedState) {
      setError('GitHub OAuth state mismatch. Please try connecting again.');
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await authService.linkGithub(userId, code);
        setIsLinked(!!result.isGithubConnected);
        setScopes(result.scopes || null);
        setInfo('GitHub account linked successfully.');
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message || 'Failed to link GitHub account';
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const handleConnect = () => {
    setError(null);
    setInfo(null);
    if (!GITHUB_CLIENT_ID) {
      setError('VITE_GITHUB_CLIENT_ID is not configured.');
      return;
    }
    const state = generateState();
    sessionStorage.setItem(STATE_STORAGE_KEY, state);
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: GITHUB_OAUTH_SCOPES,
      state,
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
  };

  const handleDisconnect = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const result = await authService.unlinkGithub(userId);
      setIsLinked(!!result.isGithubConnected);
      setScopes(null);
      setInfo('GitHub account unlinked.');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to unlink GitHub account';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const scopeList = scopes ? scopes.split(/[,\s]+/).filter(Boolean) : [];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#1f1f23] bg-[#131316]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-[#1f1f23] p-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#26262b] bg-[#0a0a0b]">
            <Link2 size={18} className="text-zinc-200" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight text-zinc-100">GitHub</h3>
            <p className="mt-0.5 text-[12px] leading-relaxed text-zinc-500">
              Sync story points and issue completion from repositories linked to your projects.
            </p>
          </div>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
            loading
              ? 'border-[#26262b] bg-[#18181c] text-zinc-400'
              : isLinked
                ? 'border-emerald-900/50 bg-emerald-900/10 text-emerald-400'
                : 'border-[#26262b] bg-[#18181c] text-zinc-500'
          }`}
        >
          {loading ? (
            <><Loader2 size={11} className="animate-spin" /> Checking</>
          ) : isLinked ? (
            <><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Connected</>
          ) : (
            <><span className="h-1.5 w-1.5 rounded-full bg-zinc-600" /> Not connected</>
          )}
        </span>
      </div>

      {/* Body */}
      <div className="p-5">
        {/* Scopes */}
        {isLinked && scopeList.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Granted scopes
            </p>
            <div className="flex flex-wrap gap-1.5">
              {scopeList.map((scope) => (
                <code
                  key={scope}
                  className="rounded-md border border-[#26262b] bg-[#0a0a0b] px-2 py-1 text-[11px] font-mono text-zinc-300"
                >
                  {scope}
                </code>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-900/40 bg-rose-950/20 p-3 text-[12px] text-rose-300">
            <AlertCircle size={13} className="mt-px shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {info && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3 text-[12px] text-emerald-300">
            <CheckCircle2 size={13} className="mt-px shrink-0" />
            <span>{info}</span>
          </div>
        )}

        {/* Action */}
        {isLinked ? (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#26262b] bg-[#18181c] py-2.5 text-[13px] font-medium text-zinc-300 transition hover:border-rose-900/60 hover:bg-rose-950/20 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Unlink size={14} />}
            {loading ? 'Working…' : 'Disconnect GitHub'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConnect}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-100 py-2.5 text-[13px] font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <LinkIcon size={14} />}
            {loading ? 'Working…' : 'Connect GitHub'}
          </button>
        )}
      </div>
    </div>
  );
};

GithubConnect.propTypes = {
  userId: PropTypes.string.isRequired,
};

export default GithubConnect;
