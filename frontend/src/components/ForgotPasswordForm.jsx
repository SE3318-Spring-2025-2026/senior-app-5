import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, Eye, EyeOff, Monitor, XCircle, CheckCircle2, KeyRound } from 'lucide-react';
import passwordResetService from '../utils/passwordResetService';
import { forgotPasswordSchema, resetPasswordSchema } from '../utils/validationSchemas';

// step: 'email' | 'reset' | 'done'
export function ForgotPasswordForm() {
  const [step, setStep] = useState('email');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /* ── Step 1 form ── */
  const emailForm = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
  });

  /* ── Step 2 form ── */
  const resetForm = useForm({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
  });

  const onEmailSubmit = async (data) => {
    setIsSubmitting(true);
    setApiError('');
    try {
      await passwordResetService.requestPasswordReset(data.email);
      setSentEmail(data.email);
      setStep('reset');
    } catch (error) {
      setApiError(error.message || 'Failed to send reset link. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResetSubmit = async (data) => {
    setIsSubmitting(true);
    setApiError('');
    try {
      await passwordResetService.confirmPasswordReset(data.token, data.newPassword);
      setStep('done');
    } catch (error) {
      setApiError(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBase = [
    'w-full rounded-xl border bg-[#111827] py-3 pl-10 pr-4 text-sm text-slate-200',
    'placeholder:text-slate-700 transition-colors duration-150',
    'focus:outline-none focus:ring-2 focus:ring-blue-600/60',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' ');

  const inputError = 'border-red-500/50 focus:ring-red-500/30';
  const inputNormal = 'border-[#1e293b] focus:border-blue-700';

  return (
    <div className="min-h-screen bg-[#060d1a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#0d1729] rounded-2xl border border-[#1e293b] p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <Monitor size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">ThesisOS</span>
        </div>

        {/* ── STEP 1: Email ── */}
        {step === 'email' && (
          <>
            <div className="mb-7">
              <h2 className="mb-1.5 text-2xl font-bold tracking-tight text-slate-100">
                Forgot Password?
              </h2>
              <p className="text-sm text-slate-500">
                Enter your email and we'll send you a reset code.
              </p>
            </div>

            {apiError && (
              <div role="alert" className="mb-5 flex items-center gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400">
                <XCircle size={16} className="shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} noValidate className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    id="email"
                    type="email"
                    placeholder="you@university.edu"
                    disabled={isSubmitting}
                    {...emailForm.register('email')}
                    className={[inputBase, emailForm.formState.errors.email ? inputError : inputNormal].join(' ')}
                  />
                </div>
                {emailForm.formState.errors.email && (
                  <p className="text-xs font-medium text-red-400">{emailForm.formState.errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white tracking-wide
                           transition-all duration-150 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30
                           active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Sending…' : 'Send Reset Code'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Remember your password?{' '}
              <a href="/login" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">Sign in</a>
            </p>
          </>
        )}

        {/* ── STEP 2: Token + New Password ── */}
        {step === 'reset' && (
          <>
            <div className="mb-7">
              <h2 className="mb-1.5 text-2xl font-bold tracking-tight text-slate-100">
                Reset Password
              </h2>
              <p className="text-sm text-slate-500">
                We sent a reset code to <span className="text-slate-300 font-medium">{sentEmail}</span>. Paste it below.
              </p>
            </div>

            {apiError && (
              <div role="alert" className="mb-5 flex items-center gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400">
                <XCircle size={16} className="shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            <form onSubmit={resetForm.handleSubmit(onResetSubmit)} noValidate className="space-y-5">
              {/* Token */}
              <div className="space-y-1.5">
                <label htmlFor="token" className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Reset Code
                </label>
                <div className="relative">
                  <KeyRound size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    id="token"
                    type="text"
                    placeholder="Paste the code from your email"
                    disabled={isSubmitting}
                    {...resetForm.register('token')}
                    className={[inputBase, 'pr-4', resetForm.formState.errors.token ? inputError : inputNormal].join(' ')}
                  />
                </div>
                {resetForm.formState.errors.token && (
                  <p className="text-xs font-medium text-red-400">{resetForm.formState.errors.token.message}</p>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label htmlFor="newPassword" className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  New Password
                </label>
                <div className="relative">
                  <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    id="newPassword"
                    type={showNew ? 'text' : 'password'}
                    placeholder="••••••••"
                    disabled={isSubmitting}
                    {...resetForm.register('newPassword')}
                    className={[inputBase, 'pr-11', resetForm.formState.errors.newPassword ? inputError : inputNormal].join(' ')}
                  />
                  <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {resetForm.formState.errors.newPassword && (
                  <p className="text-xs font-medium text-red-400">{resetForm.formState.errors.newPassword.message}</p>
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
                    placeholder="••••••••"
                    disabled={isSubmitting}
                    {...resetForm.register('confirmPassword')}
                    className={[inputBase, 'pr-11', resetForm.formState.errors.confirmPassword ? inputError : inputNormal].join(' ')}
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {resetForm.formState.errors.confirmPassword && (
                  <p className="text-xs font-medium text-red-400">{resetForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white tracking-wide
                           transition-all duration-150 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30
                           active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Didn't receive a code?{' '}
              <button onClick={() => { setStep('email'); setApiError(''); }} className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                Resend
              </button>
            </p>
          </>
        )}

        {/* ── STEP 3: Done ── */}
        {step === 'done' && (
          <div className="flex flex-col items-center gap-4 text-center py-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15 ring-1 ring-green-500/30">
              <CheckCircle2 size={28} className="text-green-400" />
            </div>
            <div>
              <h2 className="mb-1.5 text-xl font-bold text-slate-100">Password Reset!</h2>
              <p className="text-sm text-slate-400">
                Your password has been updated successfully.
              </p>
            </div>
            <a
              href="/login"
              className="mt-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Sign In
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
