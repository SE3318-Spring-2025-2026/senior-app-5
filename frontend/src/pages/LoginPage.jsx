import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Monitor,
  UserPlus,
  XCircle,
} from 'lucide-react';
import authService from '../utils/authService';
import apiClient from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email field is required')
    .email('Please enter a valid institutional email address'),
  password: z
    .string()
    .min(1, 'Password field is required')
    .min(6, 'Password must be at least 6 characters'),
});

export const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { login } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setApiError('Your session has expired. Please log in again.');
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setApiError(null);
    try {
      const response = await authService.login(data.email, data.password);
      const token = response.accessToken || response.token;
      if (!token) throw new Error('Authentication token missing from server response.');
      localStorage.setItem('accessToken', token);
      const meResponse = await apiClient.get('/auth/me');
      localStorage.setItem('user', JSON.stringify(meResponse.data));
      await login();
      navigate(from, { replace: true });
    } catch (error) {
      console.error('[AuthError]:', error);
      localStorage.removeItem('accessToken');
      setApiError(error.response?.data?.message || error.message || 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full font-sans overflow-hidden bg-slate-950">

      {/* ═══════════════════════════════════════
          FULLSCREEN — Spline 3D Viewer Background
      ═══════════════════════════════════════ */}
      <spline-viewer
        url="https://prod.spline.design/S1fJvpaMlLiE3E3K/scene.splinecode"
        style={{
          position: 'fixed',
          left: '-18vw',
          width: '124vw',
          height: '158vh',
          top: '-40vh',
          zIndex: 0,
          pointerEvents: 'auto',
        }}
      />

      {/* Subtle gradient overlay — does not block mouse */}
      <div
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          background: 'radial-gradient(circle at 30% 50%, rgba(59, 130, 246, 0.04), transparent 64%)',
        }}
      />

      <div className="login-spline-veil pointer-events-none fixed inset-0 z-[12]" aria-hidden />

      <div className="pointer-events-none relative z-20 flex min-h-screen w-full">

        {/* ═══════════════════════════════════════
            LEFT — Branding overlay (no background, lets Spline show)
        ═══════════════════════════════════════ */}
        <aside className="pointer-events-none hidden lg:flex flex-1 flex-col">
         

          {/* Hero copy — pushed to vertical center */}
          <div className="pointer-events-none flex flex-1 flex-col justify-center px-14 pb-120">
            <h1 className="mb-4 max-w-md text-5xl font-extrabold leading-[1.07] tracking-tight text-slate-50 drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
              Elevate your academic research.
            </h1>
            <p className="max-w-sm text-base leading-relaxed text-slate-200/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
              The complete project management ecosystem for senior thesis candidates and faculty advisors.
            </p>
          </div>

          {/* Bottom stat badges */}
          <div className="pointer-events-none flex gap-10 px-14 pb-12">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-300/80 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                Institutional Trust
              </p>
              <p className="text-sm font-semibold text-slate-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">Yasar University</p>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-300/80 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                Secure Portal
              </p>
              <p className="text-sm font-semibold text-slate-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">AES-256 Encrypted</p>
            </div>
          </div>
        </aside>

        {/* ═══════════════════════════════════════
            RIGHT — Transparent glass form panel
        ═══════════════════════════════════════ */}
        <section
          className="pointer-events-auto relative flex w-full flex-col items-center justify-center overflow-hidden px-6 py-14 lg:w-115 lg:flex-none"
          style={{
            background:
              'linear-gradient(165deg, #1c1c1f 0%, #151517 38%, #0f0f11 72%, #141416 100%)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >

        {/* Large masked logo — soft vignette into panel (not a small inline mark) */}
        <div
          className="pointer-events-none absolute left-1/2 top-[-11%] z-0 w-[min(120vw,40rem)] -translate-x-1/2 sm:top-[-9%] sm:w-[min(110vw,44rem)] lg:top-[-7%] lg:w-[min(48rem,95%)]"
          aria-hidden
        >
          <div
            className="relative aspect-square w-full"
            style={{
              WebkitMaskImage:
                'radial-gradient(ellipse 52% 46% at 50% 44%, #000 0%, rgba(0,0,0,0.42) 26%, rgba(0,0,0,0.18) 46%, rgba(0,0,0,0.06) 58%, rgba(0,0,0,0.02) 68%, transparent 76%)',
              maskImage:
                'radial-gradient(ellipse 52% 46% at 50% 44%, #000 0%, rgba(0,0,0,0.42) 26%, rgba(0,0,0,0.18) 46%, rgba(0,0,0,0.06) 58%, rgba(0,0,0,0.02) 68%, transparent 76%)',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskSize: '100% 100%',
              maskSize: '100% 100%',
            }}
          >
            <img
              src="/red-team-badge.png"
              alt=""
              className="h-full w-full scale-110 object-contain object-center opacity-40 [mix-blend-mode:screen] sm:scale-100"
            />
            {/* Extra veil — blends logos into panel */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 62% 54% at 50% 44%, rgba(20, 20, 22, 0) 32%, rgba(17, 17, 19, 0.45) 58%, rgba(15, 15, 17, 0.82) 78%, rgba(12, 12, 14, 0.92) 100%)',
              }}
            />
          </div>
        </div>

        {/* Large masked logo — bottom (mirror vignette) */}
        <div
          className="pointer-events-none absolute bottom-[-14%] left-1/2 z-0 w-[min(120vw,40rem)] -translate-x-1/2 sm:bottom-[-11%] sm:w-[min(110vw,44rem)] lg:bottom-[-8%] lg:w-[min(48rem,95%)]"
          aria-hidden
        >
          <div
            className="relative aspect-square w-full"
            style={{
              WebkitMaskImage:
                'radial-gradient(ellipse 52% 46% at 50% 58%, #000 0%, rgba(0,0,0,0.42) 26%, rgba(0,0,0,0.18) 46%, rgba(0,0,0,0.06) 58%, rgba(0,0,0,0.02) 68%, transparent 76%)',
              maskImage:
                'radial-gradient(ellipse 52% 46% at 50% 58%, #000 0%, rgba(0,0,0,0.42) 26%, rgba(0,0,0,0.18) 46%, rgba(0,0,0,0.06) 58%, rgba(0,0,0,0.02) 68%, transparent 76%)',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskSize: '100% 100%',
              maskSize: '100% 100%',
            }}
          >
            <img
              src="/blue-team-badge.png"
              alt=""
              className="h-full w-full scale-110 object-contain object-center opacity-40 [mix-blend-mode:screen] sm:scale-100"
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 62% 54% at 50% 58%, rgba(20, 20, 22, 0) 32%, rgba(17, 17, 19, 0.45) 58%, rgba(15, 15, 17, 0.82) 78%, rgba(12, 12, 14, 0.92) 100%)',
              }}
            />
          </div>
        </div>

        {/* Mobile logo */}
        <div className="relative z-10 mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <Monitor size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-slate-100 tracking-tight">ThesisOS</span>
        </div>

        <div className="relative z-10 w-full max-w-sm">

          {/* Heading */}
          <div className="mb-7">
            <h2 className="mb-1.5 text-2xl font-bold tracking-tight text-slate-100">
              Welcome back
            </h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              Access your project workspace and rubrics.
            </p>
          </div>

          {/* API error */}
          {apiError && (
            <div
              role="alert"
              className="mb-5 flex items-center gap-2.5 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300"
            >
              <XCircle size={16} className="shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

            {/* ── Email ── */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500"
              >
                Institutional Email
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600"
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@university.edu"
                  disabled={isSubmitting}
                  {...register('email')}
                  className={[
                    'w-full rounded-xl border bg-[#0a0a0b] py-3 pl-10 pr-4 text-sm text-slate-200',
                    'placeholder:text-zinc-500 transition-colors duration-150',
                    'focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500/60',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    errors.email
                      ? 'border-rose-500/45 bg-rose-500/[0.03]'
                      : 'border-[#26262b]',
                  ].join(' ')}
                />
              </div>
              {errors.email && (
                <p className="text-xs font-medium text-red-300">{errors.email.message}</p>
              )}
            </div>

            {/* ── Password ── */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600"
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  {...register('password')}
                  className={[
                    'w-full rounded-xl border bg-[#0a0a0b] py-3 pl-10 pr-11 text-sm text-slate-200',
                    'placeholder:text-zinc-500 transition-colors duration-150',
                    'focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500/60',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    errors.password
                      ? 'border-rose-500/45 bg-rose-500/[0.03]'
                      : 'border-[#26262b]',
                  ].join(' ')}
                />
                <button
                  type="button"
                  aria-label="Toggle password visibility"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 transition-[color,box-shadow] duration-200 hover:text-red-300 hover:shadow-[0_0_36px_rgba(239,68,68,0.4),0_0_56px_rgba(239,68,68,0.22)]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs font-medium text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* ── Remember + Forgot ── */}
            <div className="flex items-center justify-between">
              <label className="group flex cursor-pointer select-none items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border border-[#3a3a40] bg-[#0a0a0b] accent-zinc-400
                             transition-all duration-150 group-hover:border-zinc-400 group-hover:shadow-md group-hover:shadow-zinc-500/10"
                />
                <span className="text-zinc-400 transition-colors duration-150 group-hover:text-zinc-300">
                  Remember Me
                </span>
              </label>
              <a
                href="/forgot-password"
                className="text-sm font-semibold text-zinc-300 transition-colors hover:text-zinc-100"
              >
                Forgot Password?
              </a>
            </div>

            {/* ── Sign In ── */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white py-3 text-sm font-bold text-zinc-950 tracking-wide
                         transition-[transform,border-color,box-shadow] duration-200 hover:border-zinc-300 hover:bg-white
                         hover:shadow-[0_8px_28px_-10px_rgba(0,0,0,0.35),0_0_52px_-4px_rgba(239,68,68,0.42),0_0_88px_-8px_rgba(239,68,68,0.28)]
                         active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-none"
            >
              {isSubmitting ? 'Authenticating…' : 'Sign In'}
            </button>

            {/* ── Divider ── */}
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Don't have an account?
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* ── Register ── */}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#2a2a30]
                         bg-[#121216] py-3 text-sm font-semibold text-slate-300
                         transition-[transform,border-color,background-color,color,box-shadow] duration-200 hover:border-[#454548]
                         hover:bg-[#18181c] hover:text-slate-100 hover:shadow-[0_0_48px_-6px_rgba(239,68,68,0.36),0_0_80px_-12px_rgba(239,68,68,0.22)]"
            >
              <UserPlus size={16} />
              Register
            </button>

          </form>

          {/* ── Footer ── */}
          <footer className="mt-8 text-center">
            <p className="text-[13px] text-zinc-500">
              Trouble logging in?{' '}
              <a href="#" className="ml-1 font-semibold text-zinc-300 transition-colors hover:text-zinc-50">
                Contact Faculty IT Support
              </a>
            </p>
            <div className="mt-3 flex justify-center gap-5">
              <a href="#" className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-400">
                Privacy Policy
              </a>
              <a href="#" className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-400">
                Terms of Service
              </a>
            </div>
          </footer>

        </div>
      </section>

      </div>
    </div>
  );
};

export default LoginPage;
