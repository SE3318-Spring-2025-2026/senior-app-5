import styles from './shared.module.css';

export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className={styles.center}>
      <div className={styles.spinner} />
      <p className={styles.text}>{text}</p>
    </div>
  );
}
