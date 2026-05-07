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
  ShieldCheck,
  Building2,
} from 'lucide-react';
import authService from '../utils/authService';
import apiClient from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';
import universityImage from '../assets/university.jpeg';

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
  const [apiError, setApiError]         = useState(null);
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
      login();
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
    <div className="flex min-h-screen w-full font-sans">

      {/* ═══════════════════════════════════════
          LEFT — Hero panel
      ═══════════════════════════════════════ */}
      <aside
        className="relative hidden lg:flex flex-1 flex-col overflow-hidden"
        style={{
          backgroundImage: `
            linear-gradient(rgba(7,14,30,0.75), rgba(5,10,22,0.88)),
            url('${universityImage}')
          `,
          backgroundSize: 'cover',
          backgroundPosition: '22% center',
        }}
      >
        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3 p-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <Monitor size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">ThesisOS</span>
        </div>

        {/* Hero copy — pushed to vertical center */}
        <div className="relative z-10 flex flex-1 flex-col justify-center px-14 pb-10">
          <h1 className="mb-4 text-5xl font-extrabold leading-[1.07] tracking-tight text-white max-w-md">
            Elevate your academic research.
          </h1>
          <p className="text-base leading-relaxed text-white/70 max-w-sm">
            The complete project management ecosystem for senior thesis candidates and faculty advisors.
          </p>
        </div>

        {/* Bottom stat badges */}
        <div className="relative z-10 flex gap-10 px-14 pb-12">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
              Institutional Trust
            </p>
            <p className="text-sm font-semibold text-white/80">Yasar University</p>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
              Secure Portal
            </p>
            <p className="text-sm font-semibold text-white/80">AES-256 Encrypted</p>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════
          RIGHT — Form panel
      ═══════════════════════════════════════ */}
      <section className="flex w-full flex-col items-center justify-center bg-[#0d1729] px-6 py-14 lg:w-[460px] lg:flex-none">

        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <Monitor size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">ThesisOS</span>
        </div>

        <div className="w-full max-w-sm">

          {/* Heading */}
          <div className="mb-7">
            <h2 className="mb-1.5 text-2xl font-bold tracking-tight text-slate-100">
              Welcome back
            </h2>
            <p className="text-sm text-slate-500">
              Access your project workspace and rubrics.
            </p>
          </div>

          {/* API error */}
          {apiError && (
            <div
              role="alert"
              className="mb-5 flex items-center gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400"
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
                className="block text-[11px] font-bold uppercase tracking-widest text-slate-400"
              >
                Institutional Email
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@university.edu"
                  disabled={isSubmitting}
                  {...register('email')}
                  className={[
                    'w-full rounded-xl border bg-[#111827] py-3 pl-10 pr-4 text-sm text-slate-200',
                    'placeholder:text-slate-700 transition-colors duration-150',
                    'focus:outline-none focus:ring-2 focus:ring-blue-600/60',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    errors.email
                      ? 'border-red-500/50 focus:ring-red-500/30'
                      : 'border-[#1e293b] focus:border-blue-700',
                  ].join(' ')}
                />
              </div>
              {errors.email && (
                <p className="text-xs font-medium text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* ── Password ── */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-[11px] font-bold uppercase tracking-widest text-slate-400"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  {...register('password')}
                  className={[
                    'w-full rounded-xl border bg-[#111827] py-3 pl-10 pr-11 text-sm text-slate-200',
                    'placeholder:text-slate-700 transition-colors duration-150',
                    'focus:outline-none focus:ring-2 focus:ring-blue-600/60',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    errors.password
                      ? 'border-red-500/50 focus:ring-red-500/30'
                      : 'border-[#1e293b] focus:border-blue-700',
                  ].join(' ')}
                />
                <button
                  type="button"
                  aria-label="Toggle password visibility"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-600 transition-colors hover:text-slate-400"
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
                  className="h-4 w-4 cursor-pointer rounded border-2 border-slate-600 bg-[#111827] accent-blue-600
                             transition-all duration-150 group-hover:border-blue-500/60 group-hover:shadow-md group-hover:shadow-blue-600/20"
                />
                <span className="text-slate-400 transition-colors duration-150 group-hover:text-slate-300">
                  Remember Me
                </span>
              </label>
              <a
                href="/forgot-password"
                className="text-sm font-semibold text-blue-400 transition-colors hover:text-blue-300"
              >
                Forgot Password?
              </a>
            </div>

            {/* ── Sign In ── */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white tracking-wide
                         transition-all duration-150 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30
                         active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Authenticating…' : 'Sign In'}
            </button>

            {/* ── Divider ── */}
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-[#1e293b]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                Don't have an account?
              </span>
              <div className="h-px flex-1 bg-[#1e293b]" />
            </div>

            {/* ── Register ── */}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#1e293b]
                         bg-[#111827] py-3 text-sm font-semibold text-slate-300
                         transition-all duration-150 hover:border-slate-600 hover:bg-[#1a2438] hover:text-slate-100"
            >
              <UserPlus size={16} />
              Register
            </button>

          </form>

          {/* ── Footer ── */}
          <footer className="mt-8 text-center">
            <p className="text-[13px] text-slate-600">
              Trouble logging in?{' '}
              <a href="#" className="ml-1 font-semibold text-slate-300 hover:text-blue-400 transition-colors">
                Contact Faculty IT Support
              </a>
            </p>
            <div className="mt-3 flex justify-center gap-5">
              <a href="#" className="text-[11px] font-semibold uppercase tracking-widest text-slate-700 hover:text-slate-500 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-[11px] font-semibold uppercase tracking-widest text-slate-700 hover:text-slate-500 transition-colors">
                Terms of Service
              </a>
            </div>
          </footer>

        </div>
      </section>

    </div>
  );
};

export default LoginPage;
