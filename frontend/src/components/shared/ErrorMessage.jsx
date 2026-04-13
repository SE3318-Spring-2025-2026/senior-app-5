import styles from './shared.module.css';

export default function ErrorMessage({ message = 'Something went wrong', onRetry }) {
  return (
    <div className={styles.center}>
      <div className={styles.errorBox}>
        <p className={styles.errorText}>⚠ {message}</p>
        {onRetry && (
          <button className={styles.retryBtn} onClick={onRetry}>
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
