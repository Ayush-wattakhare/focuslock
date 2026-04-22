import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>🔒 FocusLock</h1>
        <p className={styles.subtitle}>
          Social Media Addiction Reducer - Coming Soon
        </p>
        <div className={styles.features}>
          <div className={styles.feature}>
            <h3>🎯 Smart Lock Rules</h3>
            <p>Timer, schedule, date-based, and nuclear mode locks</p>
          </div>
          <div className={styles.feature}>
            <h3>🏆 Gamification</h3>
            <p>Streaks, badges, and weekly challenges</p>
          </div>
          <div className={styles.feature}>
            <h3>🤝 Buddy System</h3>
            <p>Social accountability with real-time notifications</p>
          </div>
          <div className={styles.feature}>
            <h3>🤖 AI Coaching</h3>
            <p>Behavioral insights powered by Claude</p>
          </div>
        </div>
      </main>
    </div>
  );
}
