import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, Monitor, XCircle, CheckCircle2 } from 'lucide-react';
import passwordResetService from '../utils/passwordResetService';
import { resetPasswordSchema } from '../utils/validationSchemas';

export function ResetPasswordForm({ onSuccess }) {
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [done, setDone] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const token = searchParams.get('token') || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
    defaultValues: { token },
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setApiError('');
    try {
      await passwordResetService.confirmPasswordReset(data.token, data.newPassword);
      reset();
      setDone(true);
      if (onSuccess) setTimeout(onSuccess, 2500);
    } catch (error) {
      setApiError(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBase = [
    'w-full rounded-xl border bg-[#111827] py-3 pl-10 pr-11 text-sm text-slate-200',
    'placeholder:text-slate-700 transition-colors duration-150',
    'focus:outline-none focus:ring-2 focus:ring-blue-600/60',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' ');

  return (
    <div className="min-h-screen bg-[#060d1a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#0d1729] rounded-2xl border border-[#1e293b] p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <Monitor size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">ThesisOS</span>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-4 text-center py-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15 ring-1 ring-green-500/30">
              <CheckCircle2 size={28} className="text-green-400" />
            </div>
            <div>
              <h2 className="mb-1.5 text-xl font-bold text-slate-100">Password Reset!</h2>
              <p className="text-sm text-slate-400">
                Your password has been updated. Redirecting to login…
              </p>
            </div>
            <a
              href="/login"
              className="mt-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Sign In
            </a>
          </div>
        ) : (
          <>
            <div className="mb-7">
              <h2 className="mb-1.5 text-2xl font-bold tracking-tight text-slate-100">
                Reset Password
              </h2>
              <p className="text-sm text-slate-500">Enter your new password below.</p>
            </div>

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
              {!token && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="token"
                    className="block text-[11px] font-bold uppercase tracking-widest text-slate-400"
                  >
                    Reset Token
                  </label>
                  <input
                    id="token"
                    type="text"
                    placeholder="Paste token from email"
                    disabled={isSubmitting}
                    {...register('token')}
                    className={[
                      'w-full rounded-xl border bg-[#111827] py-3 px-4 text-sm text-slate-200',
                      'placeholder:text-slate-700 transition-colors duration-150',
                      'focus:outline-none focus:ring-2 focus:ring-blue-600/60',
                      errors.token
                        ? 'border-red-500/50 focus:ring-red-500/30'
                        : 'border-[#1e293b] focus:border-blue-700',
                    ].join(' ')}
                  />
                  {errors.token && (
                    <p className="text-xs font-medium text-red-400">{errors.token.message}</p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="newPassword"
                  className="block text-[11px] font-bold uppercase tracking-widest text-slate-400"
                >
                  New Password
                </label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
                  />
                  <input
                    id="newPassword"
                    type={showNew ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    disabled={isSubmitting}
                    {...register('newPassword')}
                    className={`${inputBase} ${errors.newPassword ? 'border-red-500/50 focus:ring-red-500/30' : 'border-[#1e293b] focus:border-blue-700'}`}
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-xs font-medium text-red-400">{errors.newPassword.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="block text-[11px] font-bold uppercase tracking-widest text-slate-400"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
                  />
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    disabled={isSubmitting}
                    {...register('confirmPassword')}
                    className={`${inputBase} ${errors.confirmPassword ? 'border-red-500/50 focus:ring-red-500/30' : 'border-[#1e293b] focus:border-blue-700'}`}
                  />
                  <button
                    type="button"
                    aria-label="Toggle confirm password visibility"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs font-medium text-red-400">{errors.confirmPassword.message}</p>
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
              Remember your password?{' '}
              <a href="/login" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                Sign in
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
