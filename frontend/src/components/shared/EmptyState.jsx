import styles from './shared.module.css';

export default function EmptyState({ title = 'Nothing here', message = '' }) {
  return (
    <div className={styles.center}>
      <h2 className={styles.emptyTitle}>{title}</h2>
      {message && <p className={styles.text}>{message}</p>}
    </div>
  );
}
