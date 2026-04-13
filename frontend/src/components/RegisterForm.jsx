import { useState, useCallback } from 'react';
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
    .max(128, 'Password must not exceed 128 characters')
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm({
    resolver: zodResolver(registrationSchema),
    mode: 'onBlur',
  });

  const password = watch('password');

  // Check password requirements in real-time
  const passwordChecks = {
    length: password?.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setApiError('');
    setSuccessMessage('');

    try {
      const result = await authService.register(data.email, data.password);
      setSuccessMessage(
        `Registration successful! Welcome, ${result.email}. Redirecting to login...`
      );
      reset();

      // Call callback after successful registration
      if (onSuccess) {
        setTimeout(() => onSuccess(result), 2500);
      }
    } catch (error) {
      setApiError(error.message || 'Registration failed. Please try again.');
      console.error('Registration error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const allChecksPassed = Object.values(passwordChecks).every(check => check === true);

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>Create Your Account</h1>
          <p className={styles.subtitle}>Join us today</p>
        </div>

        {successMessage && (
          <div className={`${styles.message} ${styles.success}`} role="alert">
            <span className={styles.messageIcon}>✓</span>
            {successMessage}
          </div>
        )}

        {apiError && (
          <div className={`${styles.message} ${styles.error}`} role="alert">
            <span className={styles.messageIcon}>✕</span>
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
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
              autoComplete="email"
              required
            />
            {errors.email && (
              <span className={styles.errorText}>{errors.email.message}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Password <span className={styles.required}>*</span>
            </label>
            <div className={styles.passwordInputWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter a strong password"
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                {...register('password')}
                disabled={isSubmitting}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={isSubmitting}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.password && (
              <span className={styles.errorText}>{errors.password.message}</span>
            )}
            <div className={styles.passwordHint}>
              <p className={styles.hintTitle}>Password requirements:</p>
              <ul className={styles.hintList}>
                <li className={passwordChecks.length ? styles.checkPassed : ''}>
                  {passwordChecks.length ? '✓' : '○'} At least 8 characters
                </li>
                <li className={passwordChecks.uppercase ? styles.checkPassed : ''}>
                  {passwordChecks.uppercase ? '✓' : '○'} At least one uppercase letter (A-Z)
                </li>
                <li className={passwordChecks.lowercase ? styles.checkPassed : ''}>
                  {passwordChecks.lowercase ? '✓' : '○'} At least one lowercase letter (a-z)
                </li>
                <li className={passwordChecks.number ? styles.checkPassed : ''}>
                  {passwordChecks.number ? '✓' : '○'} At least one number (0-9)
                </li>
              </ul>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>
              Confirm Password <span className={styles.required}>*</span>
            </label>
            <div className={styles.passwordInputWrapper}>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                className={`${styles.input} ${
                  errors.confirmPassword ? styles.inputError : ''
                }`}
                {...register('confirmPassword')}
                disabled={isSubmitting}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                disabled={isSubmitting}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className={styles.errorText}>
                {errors.confirmPassword.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            className={styles.button}
            disabled={isSubmitting || !allChecksPassed}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className={styles.spinner}></span>
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className={styles.divider}>
          <span>Already have an account?</span>
        </div>

        <a href="/login" className={styles.loginLink}>
          Sign in here
        </a>
      </div>
    </div>
  );
}

export default RegisterForm;
