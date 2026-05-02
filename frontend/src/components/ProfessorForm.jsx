import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import authService from '../utils/authService';
import styles from './ProfessorForm.module.css';

const ROLES = ['Professor'];

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
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <div className={styles.header}>
          <h2 className={styles.title}>Add Professor</h2>
          <p className={styles.subtitle}>Create a professor account</p>
        </div>

        {apiError && (
          <div className={`${styles.message} ${styles.error}`} role="alert">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email *
            </label>
            <input
              id="email"
              type="email"
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              {...register('email')}
              disabled={isSubmitting}
            />
            {errors.email && <span className={styles.errorText}>{errors.email.message}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Password *
            </label>
            <input
              id="password"
              type="password"
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              {...register('password')}
              disabled={isSubmitting}
              autoComplete="new-password"
            />
            {errors.password && (
              <span className={styles.errorText}>{errors.password.message}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="role" className={styles.label}>
              Role *
            </label>
            <select
              id="role"
              className={`${styles.select} ${errors.role ? styles.inputError : ''}`}
              {...register('role')}
              disabled={isSubmitting}
            >
              <option value="">Select role</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            {errors.role && <span className={styles.errorText}>{errors.role.message}</span>}
          </div>

          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Professor'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProfessorForm;