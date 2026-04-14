import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import authService from '../utils/authService';
import styles from './LoginPage.module.css';
import { useAuth } from '../context/AuthContext';

// Define validation schema for login
const loginSchema = z.object({
  email: z
    .string({ message: 'Email is required' })
    .email('Invalid email address'),
  password: z
    .string({ message: 'Password is required' })
    .min(1, 'Password cannot be empty'),
});

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

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
    setApiError('');

    try {
      const result = await authService.login(data.email, data.password);
      login();
      // Successfully logged in, can redirect to dashboard
      navigate('/groups');
    } catch (error) {
      setApiError(error.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>Sign in to your account</p>

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
              placeholder="Enter your password"
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              {...register('password')}
              disabled={isSubmitting}
            />
            {errors.password && (
              <span className={styles.errorText}>{errors.password.message}</span>
            )}
          </div>

          <button
            type="submit"
            className={styles.button}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p className={styles.forgotPasswordLink}>
          <a href="/forgot-password">Forgot your password?</a>
        </p>

        <p className={styles.registerLink}>
          Don't have an account? <a href="/register">Sign up here</a>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
