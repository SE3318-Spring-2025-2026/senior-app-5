import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import authService from '../utils/authService';
import styles from './RegisterForm.module.css';

// Define validation schema using Zod
const registrationSchema = z.object({
  email: z
    .string({ message: 'Email is required' })
    .email('Invalid email address')
    .toLowerCase(),
  password: z
    .string({ message: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string({ message: 'Please confirm your password' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export function RegisterForm({ onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(registrationSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setApiError('');
    setSuccessMessage('');

    try {
      const result = await authService.register(data.email, data.password);
      setSuccessMessage(
        `Registration successful! Welcome, ${result.email}. You can now log in.`
      );
      reset();
      
      // Call callback after successful registration
      if (onSuccess) {
        setTimeout(() => onSuccess(result), 2000);
      }
    } catch (error) {
      setApiError(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <h1 className={styles.title}>Create Your Account</h1>
        <p className={styles.subtitle}>Join us today</p>

        {successMessage && (
          <div className={`${styles.message} ${styles.success}`}>
            ✓ {successMessage}
          </div>
        )}

        {apiError && (
          <div className={`${styles.message} ${styles.error}`}>
            ✕ {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email Address <span className={styles.required}>*</span>
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              {...register('email')}
              disabled={isSubmitting}
            />
            {errors.email && (
              <span className={styles.errorText}>{errors.email.message}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Password <span className={styles.required}>*</span>
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter a strong password"
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              {...register('password')}
              disabled={isSubmitting}
            />
            {errors.password && (
              <span className={styles.errorText}>{errors.password.message}</span>
            )}
            <div className={styles.passwordHint}>
              <p className={styles.hintTitle}>Password requirements:</p>
              <ul className={styles.hintList}>
                <li>• At least 8 characters</li>
                <li>• At least one uppercase letter (A-Z)</li>
                <li>• At least one lowercase letter (a-z)</li>
                <li>• At least one number (0-9)</li>
              </ul>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>
              Confirm Password <span className={styles.required}>*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              className={`${styles.input} ${
                errors.confirmPassword ? styles.inputError : ''
              }`}
              {...register('confirmPassword')}
              disabled={isSubmitting}
            />
            {errors.confirmPassword && (
              <span className={styles.errorText}>
                {errors.confirmPassword.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            className={styles.button}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className={styles.loginLink}>
          Already have an account? <a href="/login">Log in here</a>
        </p>
      </div>
    </div>
  );
}

export default RegisterForm;
