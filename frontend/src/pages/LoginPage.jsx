import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import authService from '../utils/authService';
import apiClient from '../utils/apiClient'; 
import styles from './LoginPage.module.css';
import { useAuth } from '../context/AuthContext';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email field is required')
    .email('Please enter a valid business email address'),
  password: z
    .string()
    .min(1, 'Password field is required')
    .min(6, 'Password must be at least 6 characters for security'),
});

export const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  
  const from = location.state?.from?.pathname || '/groups';

  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setApiError('Your session has expired. Please log in again.');
    }
  }, [searchParams]);

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
    setApiError(null);

    try {
      const response = await authService.login(data.email, data.password);
      const token = response.accessToken || response.token;
      
      if (!token) throw new Error("Authentication token missing from server response.");
      localStorage.setItem('accessToken', token);

      const meResponse = await apiClient.get('/auth/me'); 
      const realUser = meResponse.data;
      localStorage.setItem('user', JSON.stringify(realUser));

      login();

      navigate(from, { replace: true }); 

    } catch (error) {
      console.error("[AuthError]:", error);
      localStorage.removeItem('accessToken');
      setApiError(error.response?.data?.message || error.message || 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <header className={styles.header}>
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>Secure Enterprise Login</p>
        </header>

        {apiError && (
          <div className={`${styles.message} ${styles.error}`} role="alert">
            <span className={styles.icon}>✕</span> {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>Email Address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@university.edu"
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              {...register('email')}
              disabled={isSubmitting}
            />
            {errors.email && <p className={styles.errorText}>{errors.email.message}</p>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              {...register('password')}
              disabled={isSubmitting}
            />
            {errors.password && <p className={styles.errorText}>{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            className={styles.button}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <footer className={styles.footer}>
          <p className={styles.forgotPasswordLink}>
            <a href="/forgot-password">Trouble signing in?</a>
          </p>
          <p className={styles.registerLink}>
            <a href="/register">Request Access</a>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default LoginPage;