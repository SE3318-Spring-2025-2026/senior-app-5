import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'react-router-dom';
import passwordResetService from '../utils/passwordResetService';
import { resetPasswordSchema } from '../utils/validationSchemas';
import styles from './ResetPasswordForm.module.css';

export function ResetPasswordForm({ onSuccess }) {
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Get token from URL query parameter
  const token = searchParams.get('token') || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
    defaultValues: {
      token: token,
    },
  });

  const newPassword = watch('newPassword');

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setApiError('');
    setSuccessMessage('');

    try {
      const result = await passwordResetService.confirmPasswordReset(
        data.token,
        data.newPassword
      );

      setSuccessMessage(
        'Password has been reset successfully. Redirecting to login...'
      );
      reset();

      // Call onSuccess callback if provided
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (error) {
      setApiError(
        error.message || 'Failed to reset password. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <h1 className={styles.title}>Reset Your Password</h1>
        <p className={styles.subtitle}>
          Enter your new password below to reset your account password
        </p>

        {apiError && (
          <div className={`${styles.message} ${styles.error}`}>
            ✕ {apiError}
          </div>
        )}

        {successMessage && (
          <div className={`${styles.message} ${styles.success}`}>
            ✓ {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="token" className={styles.label}>
              Reset Token <span className={styles.required}>*</span>
            </label>
            <input
              id="token"
              type="text"
              placeholder="Token from reset email"
              className={`${styles.input} ${
                errors.token ? styles.inputError : ''
              }`}
              {...register('token')}
              disabled={isSubmitting}
              readOnly={!!token}
            />
            {errors.token && (
              <span className={styles.errorText}>{errors.token.message}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="newPassword" className={styles.label}>
              New Password <span className={styles.required}>*</span>
            </label>
            <input
              id="newPassword"
              type="password"
              placeholder="Enter new password"
              className={`${styles.input} ${
                errors.newPassword ? styles.inputError : ''
              }`}
              {...register('newPassword')}
              disabled={isSubmitting}
            />
            {errors.newPassword && (
              <span className={styles.errorText}>
                {errors.newPassword.message}
              </span>
            )}
            <small className={styles.hint}>
              Password must be at least 8 characters and include uppercase,
              lowercase, and numbers
            </small>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>
              Confirm Password <span className={styles.required}>*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
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
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <p className={styles.backLink}>
          Remember your password?{' '}
          <a href="/login" className={styles.link}>
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
