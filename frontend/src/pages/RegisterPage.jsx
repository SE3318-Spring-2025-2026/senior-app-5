import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import {
  Monitor,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  CheckCircle2,
  Circle,
  XCircle,
  Check,
} from 'lucide-react';
import authService from '../utils/authService';

const schema = z
  .object({
    email: z
      .string({ message: 'Email is required' })
      .email('Invalid email address')
      .toLowerCase(),
    password: z
      .string({ message: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must not exceed 128 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string({ message: 'Please confirm your password' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const inputBase = [
  'w-full rounded-xl border bg-[rgba(15,23,42,0.72)] py-3 pl-10 pr-11 text-sm text-slate-200',
  'placeholder:text-slate-600 transition-colors duration-150',
  'focus:outline-none focus:ring-2 focus:ring-slate-500/30 focus:border-slate-400/50',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');
const inputNormal = 'border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]';
const inputErr    = 'border-red-500/50';

function Req({ met, label }) {
  return (
    <li className="flex items-center gap-1.5 text-xs">
      {met ? (
        <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
      ) : (
        <Circle size={13} className="shrink-0 text-slate-600" />
      )}
      <span className={met ? 'text-emerald-400' : 'text-slate-500'}>{label}</span>
    </li>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [done, setDone]             = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError]     = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), mode: 'onBlur' });

  const pwd = watch('password') ?? '';
  const checks = {
    length: pwd.length >= 8,
    upper:  /[A-Z]/.test(pwd),
    lower:  /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
  };
  const allPassed = Object.values(checks).every(Boolean);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setApiError('');
    try {
      await authService.register(data.email, data.password);
      reset();
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setApiError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full font-sans overflow-hidden bg-slate-950">

      {/* Spline 3D background */}
      <spline-viewer
        url="https://prod.spline.design/S1fJvpaMlLiE3E3K/scene.splinecode"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          pointerEvents: 'auto',
        }}
      />

      <div
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          background: 'radial-gradient(circle at 30% 50%, rgba(59, 130, 246, 0.04), transparent 64%)',
        }}
      />

      <div className="pointer-events-none relative z-20 flex min-h-screen w-full">

        {/* LEFT — branding */}
        <aside className="pointer-events-none hidden lg:flex flex-1 flex-col">
          <div className="pointer-events-none flex flex-1 flex-col justify-center px-14 pb-120">
            <h1 className="mb-4 max-w-md text-5xl font-extrabold leading-[1.07] tracking-tight text-slate-50 drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
              Elevate your academic research.
            </h1>
            <p className="max-w-sm text-base leading-relaxed text-slate-200/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
              The complete project management ecosystem for senior thesis candidates and faculty advisors.
            </p>
          </div>
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

        {/* RIGHT — form panel */}
        <section
          className="pointer-events-auto flex w-full flex-col items-center justify-center px-6 py-14 lg:w-115 lg:flex-none"
          style={{
            background: '#080f1f',
            borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >

          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
              <Monitor size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-slate-100 tracking-tight">ThesisOS</span>
          </div>

          <div className="w-full max-w-sm">

            {/* Success state */}
            {done ? (
              <div className="flex flex-col items-center gap-5 text-center py-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30">
                  <Check size={32} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="mb-2 text-xl font-bold text-slate-100">Account Created!</h2>
                  <p className="text-sm text-slate-400">
                    Registration successful. Redirecting you to login&hellip;
                  </p>
                </div>
                <button
                  onClick={() => navigate('/login')}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#111827] py-3 text-sm font-bold text-slate-100 tracking-wide transition-all duration-150 hover:bg-[#1e293b]"
                >
                  Go to Login
                </button>
              </div>
            ) : (
              <>
                <div className="mb-7">
                  <h2 className="mb-1.5 text-2xl font-bold tracking-tight text-slate-100">
                    Create your account
                  </h2>
                  <p className="text-sm text-slate-400">
                    Join ThesisOS and start managing your research.
                  </p>
                </div>

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

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Institutional Email
                    </label>
                    <div className="relative">
                      <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="name@university.edu"
                        disabled={isSubmitting}
                        {...register('email')}
                        className={`${inputBase} ${errors.email ? inputErr : inputNormal}`}
                      />
                    </div>
                    {errors.email && <p className="text-xs font-medium text-red-300">{errors.email.message}</p>}
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                      <input
                        id="password"
                        type={showPwd ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Create a strong password"
                        disabled={isSubmitting}
                        {...register('password')}
                        className={`${inputBase} ${errors.password ? inputErr : inputNormal}`}
                      />
                      <button
                        type="button"
                        aria-label="Toggle password visibility"
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 transition-colors hover:text-slate-300"
                      >
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs font-medium text-red-300">{errors.password.message}</p>}

                    {pwd.length > 0 && (
                      <ul className="mt-2 space-y-1 rounded-lg border border-white/10 bg-[rgba(15,23,42,0.5)] px-4 py-3">
                        <Req met={checks.length} label="At least 8 characters" />
                        <Req met={checks.upper}  label="At least one uppercase letter (A-Z)" />
                        <Req met={checks.lower}  label="At least one lowercase letter (a-z)" />
                        <Req met={checks.number} label="At least one number (0-9)" />
                      </ul>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="confirmPassword" className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                      <input
                        id="confirmPassword"
                        type={showConfirm ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Re-enter your password"
                        disabled={isSubmitting}
                        {...register('confirmPassword')}
                        className={`${inputBase} ${errors.confirmPassword ? inputErr : inputNormal}`}
                      />
                      <button
                        type="button"
                        aria-label="Toggle confirm password visibility"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 transition-colors hover:text-slate-300"
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-xs font-medium text-red-300">{errors.confirmPassword.message}</p>}
                  </div>

                  {/* Create Account */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !allPassed}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#111827] py-3 text-sm font-bold text-slate-100 tracking-wide
                               transition-all duration-150 hover:bg-[#1e293b] hover:shadow-lg hover:shadow-black/25
                               active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Creating Account…' : 'Create Account'}
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3 py-1">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Already have an account?
                    </span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  {/* Sign In */}
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/10
                               bg-[rgba(15,23,42,0.65)] py-3 text-sm font-semibold text-slate-300
                               transition-all duration-150 hover:border-slate-500/40 hover:bg-[rgba(31,41,55,0.72)] hover:text-slate-100"
                  >
                    <LogIn size={16} />
                    Sign In
                  </button>

                </form>

                <footer className="mt-8 text-center">
                  <p className="text-[13px] text-slate-500">
                    Trouble registering?{' '}
                    <a href="#" className="ml-1 font-semibold text-slate-200 transition-colors hover:text-slate-50">
                      Contact Faculty IT Support
                    </a>
                  </p>
                  <div className="mt-3 flex justify-center gap-5">
                    <a href="#" className="text-[11px] font-semibold uppercase tracking-widest text-slate-600 transition-colors hover:text-slate-400">
                      Privacy Policy
                    </a>
                    <a href="#" className="text-[11px] font-semibold uppercase tracking-widest text-slate-600 transition-colors hover:text-slate-400">
                      Terms of Service
                    </a>
                  </div>
                </footer>
              </>
            )}

          </div>
        </section>

      </div>
    </div>
  );
}

export default RegisterPage;
