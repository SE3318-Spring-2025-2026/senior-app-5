import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import authService from '../utils/authService';

const ROLES = ['Professor', 'Student'];

const professorSchema = z.object({
  email: z.string({ message: 'Email is required' }).email('Invalid email address'),
  password: z
    .string({ message: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z
    .string({ message: 'Role is required' })
    .refine((val) => ROLES.includes(val), 'Invalid role selected'),
});

const inputClass = (hasError) =>
  [
    'w-full rounded-xl border bg-[#111827] px-3 py-2 text-sm text-slate-200',
    'placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-colors',
    hasError
      ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
      : 'border-[#1e293b] focus:border-blue-700 focus:ring-blue-600/30',
  ].join(' ');

export function ProfessorForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(professorSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '', role: '' },
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setApiError('');
    try {
      await authService.registerProfessor(data.email, data.password, data.role);
      reset();
      toast.success('Professor created successfully.');
    } catch (error) {
      const message = error.message || 'Failed to create professor.';
      setApiError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {apiError && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1">
          <label htmlFor="pf-email" className="block text-xs font-semibold text-slate-400">
            Email *
          </label>
          <input
            id="pf-email"
            type="email"
            className={inputClass(!!errors.email)}
            {...register('email')}
            disabled={isSubmitting}
          />
          {errors.email && (
            <p className="text-xs text-red-400">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="pf-password" className="block text-xs font-semibold text-slate-400">
            Password *
          </label>
          <input
            id="pf-password"
            type="password"
            className={inputClass(!!errors.password)}
            {...register('password')}
            disabled={isSubmitting}
            autoComplete="new-password"
          />
          {errors.password && (
            <p className="text-xs text-red-400">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="pf-role" className="block text-xs font-semibold text-slate-400">
            Role *
          </label>
          <select
            id="pf-role"
            className={inputClass(!!errors.role)}
            {...register('role')}
            disabled={isSubmitting}
          >
            <option value="">Select role</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          {errors.role && (
            <p className="text-xs text-red-400">{errors.role.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Creating…' : 'Create User'}
        </button>
      </form>
    </div>
  );
}

export default ProfessorForm;
