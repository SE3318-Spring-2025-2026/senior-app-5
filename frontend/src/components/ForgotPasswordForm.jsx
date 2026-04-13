import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import passwordResetService from '../utils/passwordResetService';
import { forgotPasswordSchema } from '../utils/validationSchemas';
import styles from './ForgotPasswordForm.module.css';

export function ForgotPasswordForm({ onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setApiError('');
    setSuccessMessage('');

    try {
      const result = await passwordResetService.requestPasswordReset(
        data.email
      );

      setSuccessMessage(
        'Password reset link has been sent to your email. Please check your inbox.'
      );
      reset();

      // Call onSuccess callback if provided
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (error) {
      setApiError(
        error.message || 'Failed to request password reset. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <h1 className={styles.title}>Forgot Password?</h1>
        <p className={styles.subtitle}>
          Enter your email address and we'll send you a link to reset your
          password
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
            <label htmlFor="email" className={styles.label}>
              Email Address <span className={styles.required}>*</span>
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              className={`${styles.input} ${
                errors.email ? styles.inputError : ''
              }`}
              {...register('email')}
              disabled={isSubmitting}
            />
            {errors.email && (
              <span className={styles.errorText}>{errors.email.message}</span>
            )}
          </div>

          <button
            type="submit"
            className={styles.button}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
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
