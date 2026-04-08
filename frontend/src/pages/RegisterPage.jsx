import { useState } from 'react';
import RegisterForm from '../components/RegisterForm';
import styles from './RegisterPage.module.css';

export function RegisterPage() {
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const handleRegistrationSuccess = (userData) => {
    setRegistrationComplete(true);
    // Here you could redirect to login page or auto-login
    // For now, just show success state
  };

  if (registrationComplete) {
    return (
      <div className={styles.successContainer}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✓</div>
          <h2 className={styles.successTitle}>Registration Successful!</h2>
          <p className={styles.successText}>
            Your account has been created successfully. You can now log in with your email and password.
          </p>
          <a href="/login" className={styles.loginButton}>
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <RegisterForm onSuccess={handleRegistrationSuccess} />
    </div>
  );
}

export default RegisterPage;
